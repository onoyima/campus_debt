<?php

namespace App\Services;

use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStatusType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoAbsentMarkService
{
    public function markAbsentForSession(AttendanceSession $session): array
    {
        $stats = ['created' => 0, 'skipped' => 0, 'errors' => []];

        if (!$session->course_assigned_id) {
            return $stats;
        }

        $absentStatusId = AttendanceStatusType::where('code', 'absent')->value('id');
        if (!$absentStatusId) {
            $stats['errors'][] = 'absent status type not found';
            return $stats;
        }

        $courseAssigned = DB::connection('mysql_remote')
            ->table('course_assigneds')
            ->where('id', $session->course_assigned_id)
            ->first();

        if (!$courseAssigned) {
            $stats['errors'][] = "Course assignment #{$session->course_assigned_id} not found";
            return $stats;
        }

        $registrations = DB::connection('mysql_remote')
            ->table('course_regs')
            ->where('course_assigned_id', $session->course_assigned_id)
            ->whereIn('is_course_reg', [1, 2])
            ->where('status', 1)
            ->get(['student_id', 'academic_session_id', 'vu_semester_id']);

        foreach ($registrations as $reg) {
            try {
                $exists = AttendanceRecord::where('student_id', $reg->student_id)
                    ->where('session_id', $session->id)
                    ->exists();

                if ($exists) {
                    $stats['skipped']++;
                    continue;
                }

                AttendanceRecord::create([
                    'student_id' => $reg->student_id,
                    'session_id' => $session->id,
                    'status_id' => $absentStatusId,
                    'attendance_method' => 'auto_absent',
                    'timestamp' => $session->session_date->startOfDay(),
                    'venue_id' => $session->venue_id,
                    'academic_session_id' => $reg->academic_session_id,
                    'vu_semester_id' => $reg->vu_semester_id,
                    'metadata' => [
                        'auto_marked' => true,
                        'marked_at' => now()->toDateTimeString(),
                        'source' => 'auto_absent_on_activation',
                    ],
                ]);

                $stats['created']++;
            } catch (\Exception $e) {
                $stats['errors'][] = "Student {$reg->student_id}: {$e->getMessage()}";
                Log::error("AutoAbsent failed for session {$session->id}, student {$reg->student_id}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $stats;
    }

    public function markAbsentForAllActiveSessions(): array
    {
        $stats = ['sessions_processed' => 0, 'total_created' => 0, 'total_skipped' => 0, 'errors' => []];

        $sessions = AttendanceSession::where('status', 'active')
            ->whereNotNull('course_assigned_id')
            ->get();

        foreach ($sessions as $session) {
            $stats['sessions_processed']++;
            $result = $this->markAbsentForSession($session);
            $stats['total_created'] += $result['created'];
            $stats['total_skipped'] += $result['skipped'];
            $stats['errors'] = array_merge($stats['errors'], $result['errors']);
        }

        return $stats;
    }
}
