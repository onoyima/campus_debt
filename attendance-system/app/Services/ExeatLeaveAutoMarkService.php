<?php

namespace App\Services;

use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStatusType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExeatLeaveAutoMarkService
{
    public function process(?int $exeatId = null): array
    {
        $stats = ['processed' => 0, 'created' => 0, 'skipped' => 0, 'failed' => 0, 'errors' => []];

        $exeatLeaveStatus = AttendanceStatusType::where('code', 'exeat_leave')->first();
        if (!$exeatLeaveStatus) {
            $stats['errors'][] = 'exeat_leave status type not found in attendance_status_types';
            return $stats;
        }

        $absentStatus = AttendanceStatusType::where('code', 'absent')->first();

        $query = DB::table('exeat_requests')
            ->where('is_expired', false)
            ->whereNotIn('status', ['rejected'])
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('exeat_approvals')
                    ->whereColumn('exeat_approvals.exeat_request_id', 'exeat_requests.id')
                    ->where('exeat_approvals.status', 'approved');
            });

        if ($exeatId) {
            $query->where('id', $exeatId);
        }

        $exeats = $query->get();

        foreach ($exeats as $exeat) {
            $stats['processed']++;

            try {
                $studentId = $exeat->student_id;
                $marked = $this->markSessionsForExeat($exeat, $studentId, $exeatLeaveStatus->id, $absentStatus?->id);
                $stats['created'] += $marked['created'];
                $stats['skipped'] += $marked['skipped'];
            } catch (\Exception $e) {
                $stats['failed']++;
                $stats['errors'][] = "Exeat {$exeat->id}: {$e->getMessage()}";
                Log::error("ExeatLeave auto-mark failed for exeat {$exeat->id}", [
                    'error' => $e->getMessage(),
                    'exeat_id' => $exeat->id,
                    'student_id' => $exeat->student_id,
                ]);
            }
        }

        return $stats;
    }

    public function markSessionsForExeat(object $exeat, int $studentId, int $exeatLeaveStatusId, ?int $absentStatusId): array
    {
        $created = 0;
        $skipped = 0;

        $departure = Carbon::parse($exeat->departure_date)->startOfDay();
        $return = Carbon::parse($exeat->return_date)->endOfDay();

        $sessions = AttendanceSession::whereBetween('session_date', [$departure->toDateString(), $return->toDateString()])
            ->where('status', 'active')
            ->get();

        foreach ($sessions as $session) {
            $existingRecord = AttendanceRecord::where('student_id', $studentId)
                ->where('session_id', $session->id)
                ->first();

            if ($existingRecord) {
                if ($existingRecord->status_id === $exeatLeaveStatusId) {
                    $skipped++;
                    continue;
                }

                if ($absentStatusId !== null && $existingRecord->status_id === $absentStatusId) {
                    $existingRecord->update(['status_id' => $exeatLeaveStatusId]);
                    $created++;
                    continue;
                }

                $skipped++;
                continue;
            }

            AttendanceRecord::create([
                'student_id' => $studentId,
                'session_id' => $session->id,
                'status_id' => $exeatLeaveStatusId,
                'attendance_method' => 'exeat_leave',
                'timestamp' => $session->session_date->startOfDay(),
                'venue_id' => $session->venue_id,
                'metadata' => [
                    'exeat_request_id' => $exeat->id,
                    'auto_marked' => true,
                    'marked_at' => now()->toDateTimeString(),
                    'reason' => $exeat->reason,
                ],
            ]);

            $created++;
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
