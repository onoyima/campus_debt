<?php

namespace App\Services;

use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceEventWindow;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceStatusType;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceEventService
{
    public function getWindows(AttendanceInstitutionalEvent $event, ?Carbon $at = null): array
    {
        // Try to find a per-day window first
        $at = $at ?? now();
        $windowDate = $at->format('Y-m-d');

        $window = AttendanceEventWindow::where('institutional_event_id', $event->id)
            ->where('window_date', $windowDate)
            ->where('is_active', true)
            ->first();

        if ($window) {
            return $window->buildWindows();
        }

        // Fallback to event-level times (for backward compatibility)
        $dateStr = $event->start_date instanceof Carbon
            ? $event->start_date->format('Y-m-d')
            : Carbon::parse($event->start_date)->format('Y-m-d');

        $open = $event->attendance_open_time
            ? Carbon::parse($dateStr.' '.$event->attendance_open_time)
            : Carbon::parse($dateStr.' 00:00:00');

        $close = $event->attendance_close_time
            ? Carbon::parse($dateStr.' '.$event->attendance_close_time)
            : $open->copy()->addHours(2);

        $graceMinutes = max(0, (int) ($event->grace_period_minutes ?? 0));
        $checkInClose = $open->copy()->addMinutes($graceMinutes);

        return [
            'event_start' => $open,
            'event_end' => $close,
            'check_in_open' => $open,
            'check_in_close' => $checkInClose,
            'late_check_in_open' => $checkInClose->copy()->addMinute(),
            'late_check_in_close' => $close,
            'check_out_open' => $event->clock_out_open_time
                ? Carbon::parse($dateStr.' '.$event->clock_out_open_time)
                : $close,
            'check_out_close' => $event->clock_out_close_time
                ? Carbon::parse($dateStr.' '.$event->clock_out_close_time)
                : $close->copy()->addHour(),
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

        $presentStatus = AttendanceStatusType::where('code', 'present')->value('id');
        $lateStatus = AttendanceStatusType::where('code', 'late')->value('id');

        $checkInScan = null;
        $checkOutScan = null;

        if ($scans && $scans->isNotEmpty()) {
            foreach ($scans as $scan) {
                if ((int) $scan->status_id === AttendanceStatusType::where('code', 'absent')->value('id')) {
                    continue;
                }
                $scanTime = Carbon::parse($scan->timestamp);
                $classification = $this->classifyScan($scanTime, $windows);

                if (in_array($classification, ['in', 'late_in']) && ! $checkInScan) {
                    $checkInScan = $scan;
                } elseif ($classification === 'out' && ! $checkOutScan) {
                    $checkOutScan = $scan;
                } elseif ($classification === 'outside' && ! $checkInScan && $event->status !== 'completed') {
                    $checkInScan = $scan;
                }
            }
        }

        // Has a check-in scan — determine present or late based on timing
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

        // No check-in, but has a clock-out scan — present but late
        if ($checkOutScan) {
            return [
                'status' => 'late',
                'status_id' => $lateStatus,
                'check_in' => null,
                'check_out' => $checkOutScan,
            ];
        }

        // No real scans at all — always pending until the event is formally completed
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

        // 1. Build expected participant list from target groups + enrolled participants
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
        // Also include explicitly enrolled participants (in case target groups were deleted)
        $enrolled = AttendanceEventParticipant::where('institutional_event_id', $event->id)
            ->get(['participant_id', 'participant_type']);
        foreach ($enrolled as $p) {
            $allExpected->push([
                'participant_id' => (int) $p->participant_id,
                'participant_type' => $p->participant_type,
            ]);
        }
        $allExpected = $allExpected->unique(fn ($i) => $i['participant_id'].'_'.$i['participant_type']);

        // 2. Fetch all scans for this event
        $allScans = AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->orderBy('timestamp')
            ->get()
            ->groupBy(fn ($r) => $r->participant_id.'_'.$r->participant_type);

        // 3. Map expected participants to their status
        $expectedMap = $allExpected->keyBy(fn ($i) => $i['participant_id'].'_'.$i['participant_type']);

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

        // 5. Expected participants with no scans — pending if no absent record yet, absent if closeEvent already ran
        $absentStatusId = AttendanceStatusType::where('code', 'absent')->value('id');

        foreach ($allExpected as $expected) {
            $key = $expected['participant_id'].'_'.$expected['participant_type'];
            if (! $allScans->has($key)) {
                $alreadyAbsent = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                    ->where('participant_id', $expected['participant_id'])
                    ->where('participant_type', $expected['participant_type'])
                    ->where('status_id', $absentStatusId)
                    ->exists();

                if ($alreadyAbsent) {
                    $absent++;
                    $status = 'absent';
                } else {
                    $pending++;
                    $status = 'pending';
                }

                $breakdown[] = [
                    'participant_id' => $expected['participant_id'],
                    'participant_type' => $expected['participant_type'],
                    'status' => $status,
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
