<?php

namespace App\Services;

use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventTargetGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EventParticipantEnrollmentService
{
    /**
     * Enroll participants for an event based on target groups
     */
    public function enrollFromTargetGroups(AttendanceInstitutionalEvent $event): int
    {
        $targetGroups = $event->targetGroups;
        $enrolled = 0;

        foreach ($targetGroups as $group) {
            $participantIds = $this->resolveTargetGroup($group);
            foreach ($participantIds as $participantId) {
                try {
                    AttendanceEventParticipant::firstOrCreate([
                        'institutional_event_id' => $event->id,
                        'participant_type' => $this->getParticipantType($group->target_type),
                        'participant_id' => $participantId,
                    ]);
                    $enrolled++;
                } catch (\Exception $e) {
                    Log::warning("Failed to enroll participant {$participantId}: " . $e->getMessage());
                }
            }
        }

        Log::info("Enrolled {$enrolled} participants for event {$event->id}");
        return $enrolled;
    }

    /**
     * Resolve target group to participant IDs
     * target_type can be: faculty, department, level, student, staff, course
     */
    protected function resolveTargetGroup(AttendanceEventTargetGroup $group): array
    {
        try {
            switch ($group->target_type) {
                case 'all_students':
                    return DB::connection('mysql_remote')
                        ->table('students')
                        ->pluck('id')
                        ->toArray();

                case 'all_staff':
                    return DB::connection('mysql_remote')
                        ->table('staff')
                        ->pluck('id')
                        ->toArray();

                case 'faculty':
                    return DB::connection('mysql_remote')
                        ->table('students')
                        ->where('faculty_id', $group->target_id)
                        ->pluck('id')
                        ->toArray();

                case 'department':
                    return DB::connection('mysql_remote')
                        ->table('students')
                        ->where('department_id', $group->target_id)
                        ->pluck('id')
                        ->toArray();

                case 'level':
                    return DB::connection('mysql_remote')
                        ->table('students')
                        ->where('current_level', $group->target_id)
                        ->pluck('id')
                        ->toArray();

                case 'course':
                    // Enroll students registered for a specific course
                    $sessionIds = \App\Models\Attendance\AttendanceSession::where('course_assigned_id', $group->target_id)
                        ->pluck('id');
                    return \App\Models\Attendance\AttendanceRecord::whereIn('session_id', $sessionIds)
                        ->distinct()
                        ->pluck('student_id')
                        ->toArray();

                case 'student':
                    return [(int) $group->target_id];

                case 'staff':
                    return [(int) $group->target_id];

                default:
                    Log::warning("Unknown target_type: {$group->target_type}");
                    return [];
            }
        } catch (\Exception $e) {
            Log::error("Failed to resolve target group {$group->id}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Map target_type to participant_type
     */
    protected function getParticipantType(string $targetType): string
    {
        $map = [
            'all_students' => 'student',
            'faculty' => 'student',
            'department' => 'student',
            'level' => 'student',
            'course' => 'student',
            'student' => 'student',
            'staff' => 'staff',
            'all_staff' => 'staff',
        ];

        return $map[$targetType] ?? 'student';
    }

    /**
     * Check if a student is eligible for a chapel event based on their faculty/dept and assigned day
     */
    public function checkChapelEligibility(int $studentId, AttendanceInstitutionalEvent $event): array
    {
        $targetGroups = $event->targetGroups;
        $reasons = [];

        foreach ($targetGroups as $group) {
            if ($group->is_recurring && $group->schedule_day) {
                $today = strtolower(now()->format('D'));
                $dayMap = ['Mon' => 'mon', 'Tue' => 'tue', 'Wed' => 'wed', 'Thu' => 'thu', 'Fri' => 'fri', 'Sat' => 'sat', 'Sun' => 'sun'];
                $currentDay = $dayMap[$today] ?? $today;

                if ($group->schedule_day !== $currentDay) {
                    continue; // Not this group's day
                }
            }

            $participants = $this->resolveTargetGroup($group);
            if (in_array($studentId, $participants)) {
                return [
                    'eligible' => true,
                    'target_group_id' => $group->id,
                    'target_type' => $group->target_type,
                    'schedule_day' => $group->schedule_day,
                ];
            }

            $reasons[] = "Not in target group: {$group->target_type} #{$group->target_id}";
        }

        return [
            'eligible' => false,
            'reasons' => $reasons,
        ];
    }
}
