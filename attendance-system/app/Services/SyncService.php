<?php

namespace App\Services;

use App\Models\Attendance\AttendanceOfflinePendingSync;
use App\Models\Attendance\AttendanceSyncConflictLog;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceStaffClocking;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventUnexpected;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncService
{
    private array $tableHandlers;

    public function __construct()
    {
        $this->tableHandlers = [
            'attendance_records' => [
                'model' => AttendanceRecord::class,
                'id_field' => 'id',
                'unique_keys' => ['student_id', 'session_id', 'timestamp'],
            ],
            'attendance_staff_clocking' => [
                'model' => AttendanceStaffClocking::class,
                'id_field' => 'id',
                'unique_keys' => ['staff_id', 'timestamp'],
            ],
            'attendance_event_attendance' => [
                'model' => AttendanceEventAttendance::class,
                'id_field' => 'id',
                'unique_keys' => ['institutional_event_id', 'participant_type', 'participant_id', 'clock_type'],
            ],
            'attendance_event_unexpected' => [
                'model' => AttendanceEventUnexpected::class,
                'id_field' => 'id',
                'unique_keys' => ['institutional_event_id', 'participant_id', 'timestamp'],
            ],
        ];
    }

    public function processSyncRecord(int $syncId): array
    {
        $record = AttendanceOfflinePendingSync::find($syncId);
        if (!$record) {
            return ['success' => false, 'error' => 'Sync record not found.'];
        }

        if ($record->status === 'synced' || $record->status === 'processed') {
            return ['success' => true, 'message' => 'Already processed.', 'record' => $record];
        }

        return $this->processPayload($record);
    }

    public function processAllPending(?int $terminalId = null): array
    {
        $query = AttendanceOfflinePendingSync::whereIn('status', ['pending', 'failed'])
            ->where('retry_count', '<', 5)
            ->orderBy('created_at', 'asc');

        if ($terminalId) {
            $query->where('terminal_id', $terminalId);
        }

        $records = $query->limit(100)->get();
        $results = [];

        foreach ($records as $record) {
            $results[] = $this->processPayload($record);
        }

        return [
            'total' => count($results),
            'successful' => count(array_filter($results, fn($r) => $r['success'])),
            'failed' => count(array_filter($results, fn($r) => !$r['success'])),
        ];
    }

    private function processPayload(AttendanceOfflinePendingSync $record): array
    {
        $payload = $record->payload;
        $tableName = $record->table_name;
        $action = $record->action;
        $deviceTimestamp = $record->device_timestamp;
        $serverTimestamp = $record->server_timestamp ?? now();

        try {
            DB::beginTransaction();

            $handler = $this->tableHandlers[$tableName] ?? null;

            if (!$handler) {
                $record->update(['status' => 'failed', 'error_message' => "No handler for table: {$tableName}"]);
                DB::commit();
                return ['success' => false, 'error' => "No handler for table: {$tableName}"];
            }

            $result = match ($action) {
                'create' => $this->handleCreate($handler, $payload, $record, $deviceTimestamp),
                'update' => $this->handleUpdate($handler, $payload, $record, $deviceTimestamp, $serverTimestamp),
                'delete' => $this->handleDelete($handler, $payload, $record),
                default => throw new \InvalidArgumentException("Unknown action: {$action}"),
            };

            DB::commit();
            return $result;
        } catch (\Exception $e) {
            DB::rollBack();

            $record->increment('retry_count');
            $status = $record->retry_count >= 5 ? 'failed' : 'pending';
            $record->update(['status' => $status, 'error_message' => $e->getMessage()]);

            Log::error("Sync failed for record {$record->id}: {$e->getMessage()}");

            return ['success' => false, 'error' => $e->getMessage(), 'record_id' => $record->id];
        }
    }

    private function handleCreate(array $handler, array $payload, AttendanceOfflinePendingSync $record, string $deviceTimestamp): array
    {
        $model = $handler['model'];
        $uniqueKeys = $handler['unique_keys'];

        $existing = $model::query();
        foreach ($uniqueKeys as $key) {
            if (isset($payload[$key])) {
                $existing->where($key, $payload[$key]);
            }
        }

        $existingRecord = $existing->first();

        if ($existingRecord) {
            $this->logConflict($record, 'create_vs_existing', $payload, $existingRecord->toArray(), $existingRecord->toArray());
            $record->update(['status' => 'processed', 'error_message' => 'Duplicate skipped', 'synced_at' => now()]);
            return ['success' => true, 'message' => 'Duplicate skipped.', 'action' => 'skipped'];
        }

        $data = array_merge($payload, [
            'created_at' => $deviceTimestamp,
            'sync_status' => 'synced',
        ]);

        $instance = $model::create($data);
        $record->update(['status' => 'processed', 'synced_at' => now()]);

        Log::info("Sync created: {$record->table_name}#{$instance->id}");

        return ['success' => true, 'message' => 'Record created.', 'action' => 'created', 'record_id' => $instance->id];
    }

    private function handleUpdate(array $handler, array $payload, AttendanceOfflinePendingSync $record, string $deviceTimestamp, string $serverTimestamp): array
    {
        $model = $handler['model'];
        $idField = $handler['id_field'];
        $id = $payload[$idField] ?? null;

        if (!$id) {
            $record->update(['status' => 'failed', 'error_message' => 'Missing ID for update']);
            return ['success' => false, 'error' => 'Missing ID for update'];
        }

        $existing = $model::find($id);

        if (!$existing) {
            $this->logConflict($record, 'update_missing_target', $payload, [], $payload);
            $record->update(['status' => 'failed', 'error_message' => 'Target record not found']);
            return ['success' => false, 'error' => 'Target record not found'];
        }

        $deviceTime = strtotime($deviceTimestamp);
        $serverTime = strtotime($existing->synced_at ?? $existing->created_at);

        if ($deviceTime < $serverTime) {
            $this->logConflict($record, 'stale_update', $payload, $existing->toArray(), $existing->toArray());
            $record->update(['status' => 'processed', 'error_message' => 'Stale update rejected (server has newer data)']);
            return ['success' => true, 'message' => 'Stale update rejected.', 'action' => 'rejected'];
        }

        $existing->update($payload);
        $record->update(['status' => 'processed', 'synced_at' => now()]);

        return ['success' => true, 'message' => 'Record updated.', 'action' => 'updated'];
    }

    private function handleDelete(array $handler, array $payload, AttendanceOfflinePendingSync $record): array
    {
        $model = $handler['model'];
        $idField = $handler['id_field'];
        $id = $payload[$idField] ?? null;

        if (!$id) {
            $record->update(['status' => 'failed', 'error_message' => 'Missing ID for delete']);
            return ['success' => false, 'error' => 'Missing ID for delete'];
        }

        $existing = $model::find($id);
        if (!$existing) {
            $record->update(['status' => 'processed', 'error_message' => 'Already deleted']);
            return ['success' => true, 'message' => 'Already deleted.'];
        }

        $existing->delete();
        $record->update(['status' => 'processed', 'synced_at' => now()]);

        return ['success' => true, 'message' => 'Record deleted.', 'action' => 'deleted'];
    }

    private function logConflict(AttendanceOfflinePendingSync $record, string $strategy, array $devicePayload, array $serverPayload, array $resolvedPayload): void
    {
        AttendanceSyncConflictLog::create([
            'sync_id' => $record->id,
            'resolution_strategy' => $strategy,
            'device_payload' => $devicePayload,
            'server_payload' => $serverPayload,
            'resolved_payload' => $resolvedPayload,
            'resolved_by' => 'system',
            'resolved_at' => now(),
        ]);
    }
}
