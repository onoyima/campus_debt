<?php

namespace App\Services;

use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventTargetGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EventParticipantEnrollmentService
{
    public function enrollFromTargetGroups(AttendanceInstitutionalEvent $event): int
    {
        $targetGroups = $event->targetGroups;
        $enrolled = 0;

        foreach ($targetGroups as $group) {
            foreach ($this->resolveTargetGroup($group) as $participantId) {
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

    public function resolveTargetGroup(AttendanceEventTargetGroup $group): array
    {
        try {
            if ($group->target_type === 'course') {
                $sessionIds = \App\Models\Attendance\AttendanceSession::where('course_assigned_id', $group->target_id)
                    ->pluck('id');
                return \App\Models\Attendance\AttendanceRecord::whereIn('session_id', $sessionIds)
                    ->distinct()->pluck('student_id')->toArray();
            }

            return match ($group->target_type) {
                'all_students' => DB::connection('mysql_remote')->table('students')->pluck('id')->toArray(),
                'all_staff' => DB::connection('mysql_remote')->table('staff')->pluck('id')->toArray(),

                'academic_staff' => DB::connection('mysql_remote')
                    ->table('staff_work_profiles')
                    ->where('staff_type_id', $group->target_id ?: 1)
                    ->pluck('staff_id')->toArray(),

                'non_academic_staff' => DB::connection('mysql_remote')
                    ->table('staff_work_profiles')
                    ->where('staff_type_id', $group->target_id ?: 2)
                    ->pluck('staff_id')->toArray(),

                'contract_staff', 'visiting_staff', 'casual_staff', 'other_staff' =>
                    DB::connection('mysql_remote')
                        ->table('staff_work_profiles')
                        ->where('staff_type_id', $group->target_id)
                        ->pluck('staff_id')->toArray(),

                'senate_members', 'management', 'principal_officers' =>
                    DB::connection('mysql_remote')
                        ->table('staff_assigned_roles')
                        ->when($group->target_id, fn($q) => $q->where('role_id', $group->target_id))
                        ->pluck('staff_id')->toArray(),

                'role' => DB::connection('mysql_remote')
                    ->table('staff_assigned_roles')
                    ->where('role_id', $group->target_id)
                    ->pluck('staff_id')->toArray(),

                'deans' => DB::connection('mysql_remote')
                    ->table('staff')
                    ->where('faculty_id', $group->target_id)
                    ->pluck('id')->toArray(),

                'directors', 'hods', 'faculty_officers', 'departmental_staff' =>
                    DB::connection('mysql_remote')
                        ->table('staff')
                        ->where('department_id', $group->target_id)
                        ->pluck('id')->toArray(),

                'undergraduate' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('student_type', 'undergraduate')
                    ->pluck('student_id')->toArray(),

                'postgraduate' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('student_type', 'postgraduate')
                    ->pluck('student_id')->toArray(),

                'diploma' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('student_type', 'diploma')
                    ->pluck('student_id')->toArray(),

                'foundation' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('student_type', 'foundation/jupeb')
                    ->pluck('student_id')->toArray(),

                'final_year' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->whereIn('level', function ($q) {
                        $q->select(DB::raw('MAX(CAST(level AS UNSIGNED))'))->from('levels')->whereNotNull('level');
                    })
                    ->pluck('student_id')->toArray(),

                'hostel_residents' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('is_hostel', true)
                    ->pluck('student_id')->toArray(),

                'other_students' => DB::connection('mysql_remote')
                    ->table('students')
                    ->pluck('id')->toArray(),

                'faculty' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('faculty_id', $group->target_id)
                    ->pluck('student_id')->toArray(),

                'department' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('department_id', $group->target_id)
                    ->pluck('student_id')->toArray(),

                'level' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('level', $group->target_id)
                    ->pluck('student_id')->toArray(),

                'level_100', 'level_200', 'level_300', 'level_400', 'level_500' =>
                    DB::connection('mysql_remote')
                        ->table('student_academics')
                        ->where('level', (int) substr($group->target_type, -3))
                        ->pluck('student_id')->toArray(),

                'programme' => DB::connection('mysql_remote')
                    ->table('student_academics')
                    ->where('course_study_id', $group->target_id)
                    ->pluck('student_id')->toArray(),

                'student' => [(int) $group->target_id],
                'staff' => [(int) $group->target_id],

                default => [],
            };
        } catch (\Exception $e) {
            Log::error("Failed to resolve target group {$group->id} type {$group->target_type}: " . $e->getMessage());
            return [];
        }
    }

    protected function getParticipantType(string $targetType): string
    {
        return match ($targetType) {
            'all_students', 'undergraduate', 'postgraduate', 'diploma', 'foundation',
            'final_year', 'hostel_residents', 'other_students', 'faculty', 'department',
            'level', 'programme', 'course', 'student'
                => 'student',

            'all_staff', 'academic_staff', 'non_academic_staff', 'senate_members',
            'management', 'principal_officers', 'deans', 'directors', 'hods',
            'faculty_officers', 'departmental_staff', 'contract_staff', 'visiting_staff',
            'casual_staff', 'other_staff', 'staff', 'role'
                => 'staff',

            default => 'student',
        };
    }

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
                    continue;
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
