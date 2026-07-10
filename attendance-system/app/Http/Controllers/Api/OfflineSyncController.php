<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceOfflinePendingSync;
use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineSyncController extends Controller
{
    private SyncService $syncService;

    public function __construct(SyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceOfflinePendingSync::query();

        if ($request->filled('terminal_id')) {
            $query->where('terminal_id', $request->terminal_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('table_name')) {
            $query->where('table_name', $request->table_name);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'terminal_id' => 'required|integer|exists:attendance_terminals,id',
            'records' => 'required|array|min:1|max:500',
            'records.*.table_name' => 'required|string',
            'records.*.action' => 'required|string|in:create,update,delete',
            'records.*.payload' => 'required|array',
            'records.*.device_timestamp' => 'required|date',
        ]);

        $created = [];
        foreach ($request->records as $rec) {
            $sync = AttendanceOfflinePendingSync::create([
                'terminal_id' => $request->terminal_id,
                'table_name' => $rec['table_name'],
                'action' => $rec['action'],
                'payload' => $rec['payload'],
                'device_timestamp' => $rec['device_timestamp'],
                'status' => 'pending',
            ]);

            // Process immediately so attendance appears in target tables in real-time
            try {
                $result = $this->syncService->processSyncRecord($sync->id);
                $sync->refresh();
                $created[] = [
                    'id' => $sync->id,
                    'table_name' => $sync->table_name,
                    'status' => $sync->status,
                    'success' => $result['success'] ?? false,
                    'error' => $result['error'] ?? null,
                ];
            } catch (\Exception $e) {
                $created[] = [
                    'id' => $sync->id,
                    'table_name' => $sync->table_name,
                    'status' => $sync->status,
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $successCount = count(array_filter($created, fn ($c) => $c['success']));
        $failCount = count($created) - $successCount;

        return response()->json([
            'data' => $created,
            'message' => "{$successCount} records synced, {$failCount} failed.",
        ], $failCount > 0 ? 207 : 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceOfflinePendingSync::with($this->parseIncludes($request, []))->find($id);
        if (! $record) {
            return response()->json(['message' => 'Offline sync record not found.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function processSync($id): JsonResponse
    {
        try {
            $result = $this->syncService->processSyncRecord((int) $id);
            $statusCode = $result['success'] ? 200 : 422;

            return response()->json([
                'data' => $result,
                'message' => $result['success'] ? 'Sync record processed successfully.' : ($result['error'] ?? 'Failed to process sync record.'),
            ], $statusCode);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to process sync record.', 'error' => $e->getMessage()], 500);
        }
    }

    public function processAll(Request $request): JsonResponse
    {
        try {
            $terminalId = $request->filled('terminal_id') ? (int) $request->terminal_id : null;
            $result = $this->syncService->processAllPending($terminalId);

            return response()->json([
                'data' => $result,
                'message' => "Processed {$result['total']} records: {$result['successful']} ok, {$result['failed']} failed.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to process sync records.', 'error' => $e->getMessage()], 500);
        }
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => [
                'pending' => AttendanceOfflinePendingSync::whereIn('status', ['pending', 'failed'])->count(),
                'failed' => AttendanceOfflinePendingSync::where('status', 'failed')->count(),
                'processed_today' => AttendanceOfflinePendingSync::where('status', 'processed')
                    ->whereDate('synced_at', today())->count(),
                'total' => AttendanceOfflinePendingSync::count(),
                'by_terminal' => AttendanceOfflinePendingSync::selectRaw('terminal_id, status, count(*) as count')
                    ->groupBy('terminal_id', 'status')
                    ->get(),
            ],
        ]);
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceOfflinePendingSync::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceOfflinePendingSync::withTrashed()->findOrFail($id);
        $model->forceDelete();

        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        return array_intersect(explode(',', $request->include), $allowed);
    }
}
