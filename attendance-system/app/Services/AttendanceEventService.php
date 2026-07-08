<?php

namespace App\Services;

use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceEventTargetGroup;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceEventService
{
    public function getWindows(AttendanceInstitutionalEvent $event): array
    {
        $start = Carbon::parse($event->start_date);
        $end = Carbon::parse($event->end_date);
        $open = $event->attendance_open_time
            ? Carbon::parse($event->start_date->format('Y-m-d') . ' ' . $event->attendance_open_time)
            : $start->copy()->subHour();

        $close = $event->attendance_close_time
            ? Carbon::parse($event->start_date->format('Y-m-d') . ' ' . $event->attendance_close_time)
            : $end->copy()->addHour();

        return [
            'event_start' => $start,
            'event_end' => $end,
            'check_in_open' => $open,
            'check_in_close' => $start->copy()->addMinutes(30),
            'late_check_in_open' => $start->copy()->addMinutes(31),
            'late_check_in_close' => $close,
            'check_out_open' => $end,
            'check_out_close' => $end->copy()->addHour(),
        ];
    }

    public function classifyScan(Carbon $scanTime, array $windows): string
    {
        if ($scanTime->between($windows['check_in_open'], $windows['check_in_close'])) {
            return 'in';
        }
        if ($scanTime->between($windows['late_check_in_open'], $windows['late_check_in_close'])) {
            return 'late_in';
        }
        if ($scanTime->between($windows['check_out_open'], $windows['check_out_close'])) {
            return 'out';
        }
        return 'outside';
    }

    public function determineStatus(AttendanceInstitutionalEvent $event, ?Collection $scans): array
    {
        $windows = $this->getWindows($event);
        $now = now();

        $presentStatus = AttendanceStatusType::where('code', 'present')->value('id');
        $lateStatus = AttendanceStatusType::where('code', 'late')->value('id');
        $absentStatus = AttendanceStatusType::where('code', 'absent')->value('id');

        $checkInScan = null;
        $checkOutScan = null;

        if ($scans && $scans->isNotEmpty()) {
            foreach ($scans as $scan) {
                $scanTime = Carbon::parse($scan->timestamp);
                $classification = $this->classifyScan($scanTime, $windows);

                if (in_array($classification, ['in', 'late_in']) && !$checkInScan) {
                    $checkInScan = $scan;
                } elseif ($classification === 'out' && !$checkOutScan) {
                    $checkOutScan = $scan;
                }
            }
        }

        if ($checkInScan) {
            $classification = $this->classifyScan(Carbon::parse($checkInScan->timestamp), $windows);
            $statusId = $classification === 'in' ? $presentStatus : $lateStatus;
            return [
                'status' => $classification === 'in' ? 'present' : 'late',
                'status_id' => $statusId,
                'check_in' => $checkInScan,
                'check_out' => $checkOutScan,
            ];
        }

        // Only mark absent if the event time window has fully closed
        $eventEnd = Carbon::parse($event->end_date);
        $closeTime = $event->attendance_close_time
            ? Carbon::parse($event->start_date instanceof Carbon ? $event->start_date->format('Y-m-d') : $event->start_date . ' ' . $event->attendance_close_time)
            : $eventEnd->copy()->addHour();

        if ($now->greaterThan($closeTime)) {
            return [
                'status' => 'absent',
                'status_id' => $absentStatus,
                'check_in' => null,
                'check_out' => null,
            ];
        }

        return [
            'status' => 'pending',
            'status_id' => null,
            'check_in' => null,
            'check_out' => null,
        ];
    }

    public function getEventAttendanceStatus(AttendanceInstitutionalEvent $event, string $participantType, int $participantId): array
    {
        $scans = AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->where('participant_type', $participantType)
            ->where('participant_id', $participantId)
            ->orderBy('timestamp')
            ->get();

        return $this->determineStatus($event, $scans);
    }

    public function buildAttendanceReport(AttendanceInstitutionalEvent $event): array
    {
        $enrollmentService = app(EventParticipantEnrollmentService::class);
        $windows = $this->getWindows($event);
        $now = now();

        // 1. Build expected participant list from target groups
        $allExpected = collect();
        foreach ($event->targetGroups as $group) {
            $ids = $enrollmentService->resolveTargetGroup($group);
            $type = $enrollmentService->getParticipantType($group->target_type);
            foreach ($ids as $pid) {
                $allExpected->push([
                    'participant_id' => (int) $pid,
                    'participant_type' => $type,
                ]);
            }
        }
        $allExpected = $allExpected->unique(fn($i) => $i['participant_id'] . '_' . $i['participant_type']);

        // 2. Fetch all scans for this event
        $allScans = AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->orderBy('timestamp')
            ->get()
            ->groupBy(fn($r) => $r->participant_id . '_' . $r->participant_type);

        // 3. Map expected participants to their status
        $expectedMap = $allExpected->keyBy(fn($i) => $i['participant_id'] . '_' . $i['participant_type']);

        $present = 0;
        $late = 0;
        $absent = 0;
        $pending = 0;
        $breakdown = [];
        $visitorScans = collect();

        // 4. Categorize scans: expected vs visitors
        foreach ($allScans as $key => $scans) {
            [$pid, $type] = explode('_', $key, 2);
            $pid = (int) $pid;

            if ($expectedMap->has($key)) {
                // Expected participant
                $expected = $expectedMap->get($key);
                $status = $this->determineStatus($event, $scans);
                $isVisitor = $scans->first()->is_visitor ?? false;

                match ($status['status']) {
                    'present' => $present++,
                    'late' => $late++,
                    'absent' => $absent++,
                    'pending' => $pending++,
                    default => null,
                };

                $breakdown[] = [
                    'participant_id' => $pid,
                    'participant_type' => $type,
                    'status' => $status['status'],
                    'check_in_time' => $status['check_in']?->timestamp,
                    'check_out_time' => $status['check_out']?->timestamp,
                    'is_visitor' => $isVisitor,
                ];
            } else {
                // Not an expected participant — this is a visitor
                $visitorScans->push([
                    'participant_id' => $pid,
                    'participant_type' => $type,
                    'status' => 'present',
                    'check_in_time' => $scans->first()?->timestamp,
                    'check_out_time' => $scans->where('clock_type', 'out')->first()?->timestamp,
                    'is_visitor' => true,
                ]);
            }
        }

        // 5. Also include expected participants with no scans (absent/pending)
        foreach ($allExpected as $expected) {
            $key = $expected['participant_id'] . '_' . $expected['participant_type'];
            if (!$allScans->has($key)) {
                $status = $this->determineStatus($event, collect());
                match ($status['status']) {
                    'absent' => $absent++,
                    'pending' => $pending++,
                    default => null,
                };
                $breakdown[] = [
                    'participant_id' => $expected['participant_id'],
                    'participant_type' => $expected['participant_type'],
                    'status' => $status['status'],
                    'check_in_time' => null,
                    'check_out_time' => null,
                    'is_visitor' => false,
                ];
            }
        }

        $expectedCount = $allExpected->count();
        $attended = $present + $late;
        $attendanceRate = $expectedCount > 0 ? round(($attended / $expectedCount) * 100, 2) : 0;

        return [
            'expected_participants' => $expectedCount,
            'present' => $present,
            'late' => $late,
            'absent' => $absent,
            'pending' => $pending,
            'total_attended' => $attended,
            'attendance_rate' => $attendanceRate,
            'breakdown' => $breakdown,
            'visitors' => $visitorScans->values()->toArray(),
        ];
    }

    public function resolveParticipantInfo(int $participantId, string $participantType): array
    {
        if ($participantType === 'staff') {
            // Staff: match staff_work_profiles.staff_no (device registers numeric part, e.g. "SAT 979" → "979")
            try {
                $profile = DB::connection('mysql_remote')
                    ->table('staff_work_profiles')
                    ->leftJoin('departments', 'staff_work_profiles.department_id', '=', 'departments.id')
                    ->leftJoin('faculties', 'departments.faculty_id', '=', 'faculties.id')
                    ->where('staff_work_profiles.staff_no', 'REGEXP', "{$participantId}$")
                    ->select('staff_work_profiles.staff_id', 'departments.name as department', 'faculties.name as faculty')
                    ->orderBy('staff_work_profiles.staff_id')
                    ->first();
                if ($profile) {
                    $staff = DB::connection('mysql_remote')
                        ->table('staff')
                        ->where('id', $profile->staff_id)
                        ->first();
                    if ($staff) {
                        return [
                            'id' => $staff->id,
                            'name' => trim("{$staff->fname} {$staff->lname}"),
                            'email' => $staff->email ?? '',
                            'department' => $profile->department ?? '',
                            'faculty' => $profile->faculty ?? '',
                        ];
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Failed to resolve staff via work profile: {$e->getMessage()}");
            }
        } else {
            // Student: direct ID lookup
            try {
                $student = DB::connection('mysql_remote')
                    ->table('students')
                    ->leftJoin('student_academics', 'students.id', '=', 'student_academics.student_id')
                    ->leftJoin('departments', 'student_academics.department_id', '=', 'departments.id')
                    ->leftJoin('faculties', 'student_academics.faculty_id', '=', 'faculties.id')
                    ->where('students.id', $participantId)
                    ->select('students.id', 'students.fname', 'students.lname', 'students.email', 'student_academics.matric_no', 'departments.name as department', 'faculties.name as faculty')
                    ->first();
                if ($student) {
                    return [
                        'id' => $student->id,
                        'name' => trim("{$student->fname} {$student->lname}"),
                        'matric_no' => $student->matric_no ?? '',
                        'email' => $student->email ?? '',
                        'department' => $student->department ?? '',
                        'faculty' => $student->faculty ?? '',
                    ];
                }
            } catch (\Exception $e) {
                Log::warning("Failed to resolve student: {$e->getMessage()}");
            }
        }

        return [
            'id' => $participantId,
            'name' => "User #{$participantId}",
        ];
    }
}
