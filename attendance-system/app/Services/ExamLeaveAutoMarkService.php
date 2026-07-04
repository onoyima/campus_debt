<?php

namespace App\Services;

use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\ExeatRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamLeaveAutoMarkService
{
    public function process(?int $exeatId = null): array
    {
        $stats = ['processed' => 0, 'created' => 0, 'skipped' => 0, 'failed' => 0, 'errors' => []];

        $examLeaveStatus = AttendanceStatusType::where('code', 'exam_leave')->first();
        if (!$examLeaveStatus) {
            $stats['errors'][] = 'exam_leave status type not found in attendance_status_types';
            return $stats;
        }

        $absentStatus = AttendanceStatusType::where('code', 'absent')->first();

        $query = ExeatRequest::query()
            ->where('is_expired', false)
            ->whereNotIn('status', ['rejected'])
            ->whereHas('approvals', function ($q) {
                $q->where('status', 'approved');
            });

        if ($exeatId) {
            $query->where('id', $exeatId);
        }

        $exeats = $query->get();

        foreach ($exeats as $exeat) {
            $stats['processed']++;

            try {
                $marked = $this->markSessionsForExeat($exeat, $examLeaveStatus->id, $absentStatus?->id);
                $stats['created'] += $marked['created'];
                $stats['skipped'] += $marked['skipped'];
            } catch (\Exception $e) {
                $stats['failed']++;
                $stats['errors'][] = "Exeat {$exeat->id}: {$e->getMessage()}";
                Log::error("ExamLeave auto-mark failed for exeat {$exeat->id}", [
                    'error' => $e->getMessage(),
                    'exeat_id' => $exeat->id,
                    'student_id' => $exeat->student_id,
                ]);
            }
        }

        return $stats;
    }

    public function markSessionsForExeat(ExeatRequest $exeat, int $examLeaveStatusId, ?int $absentStatusId): array
    {
        $created = 0;
        $skipped = 0;

        $departure = Carbon::parse($exeat->departure_date)->startOfDay();
        $return = Carbon::parse($exeat->return_date)->endOfDay();

        $sessions = AttendanceSession::whereBetween('session_date', [$departure->toDateString(), $return->toDateString()])
            ->where('status', 'active')
            ->get();

        foreach ($sessions as $session) {
            $existingRecord = AttendanceRecord::where('student_id', $exeat->student_id)
                ->where('session_id', $session->id)
                ->first();

            if ($existingRecord) {
                if ($existingRecord->status_id === $examLeaveStatusId) {
                    $skipped++;
                    continue;
                }

                if ($absentStatusId !== null && $existingRecord->status_id === $absentStatusId) {
                    $existingRecord->update(['status_id' => $examLeaveStatusId]);
                    $created++;
                    continue;
                }

                $skipped++;
                continue;
            }

            AttendanceRecord::create([
                'student_id' => $exeat->student_id,
                'session_id' => $session->id,
                'status_id' => $examLeaveStatusId,
                'attendance_method' => 'exam_leave',
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
