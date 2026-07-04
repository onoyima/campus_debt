<?php

namespace App\Services;

use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceExamEligibilityLog;
use App\Models\Attendance\AttendanceExamEligibilityStatus;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStatusType;
use Illuminate\Support\Facades\DB;

class EligibilityEngineService
{
    public function evaluateAll(): array
    {
        $studentIds = AttendanceRecord::distinct()->pluck('student_id');
        $courseIds = AttendanceSession::whereNotNull('course_assigned_id')
            ->distinct()->pluck('course_assigned_id');
        $results = [];

        foreach ($studentIds as $studentId) {
            foreach ($courseIds as $courseId) {
                $results[] = $this->evaluate($studentId, $courseId);
            }
        }

        return $results;
    }

    public function evaluateStudent(int $studentId): array
    {
        $courseIds = AttendanceRecord::where('student_id', $studentId)
            ->distinct()->pluck('session_id')
            ->map(fn($sid) => AttendanceSession::find($sid)?->course_assigned_id)
            ->filter();

        $results = [];
        foreach ($courseIds as $courseId) {
            $results[] = $this->evaluate($studentId, $courseId);
        }

        return $results;
    }

    public function evaluateCourse(int $courseId): array
    {
        $sessionIds = AttendanceSession::where('course_assigned_id', $courseId)->pluck('id');
        $studentIds = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->distinct()->pluck('student_id');

        $results = [];
        foreach ($studentIds as $studentId) {
            $results[] = $this->evaluate($studentId, $courseId);
        }

        return $results;
    }

    public function evaluate(int $studentId, int $courseId): AttendanceExamEligibility
    {
        $sessionIds = AttendanceSession::where('course_assigned_id', $courseId)
            ->where('status', 'closed')
            ->pluck('id');

        $presentStatusIds = AttendanceStatusType::where('counts_as_present', true)->pluck('id');
        $neutralStatusIds = AttendanceStatusType::where('counts_as_present', false)
            ->where('counts_as_absent', false)
            ->pluck('id');

        $totalClasses = count($sessionIds);
        $attendedClasses = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->where('student_id', $studentId)
            ->whereIn('status_id', $presentStatusIds)
            ->count();

        $neutralClasses = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->where('student_id', $studentId)
            ->whereIn('status_id', $neutralStatusIds)
            ->count();

        $adjustedTotal = max(0, $totalClasses - $neutralClasses);
        $attendancePercentage = $adjustedTotal > 0
            ? round(($attendedClasses / $adjustedTotal) * 100, 2)
            : 0;

        $schoolFeesCleared = $this->checkSchoolFees($studentId);
        $attendanceDebtsCleared = !AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', 'unpaid')
            ->where('blocks_eligibility', true)
            ->exists();
        $courseRegistered = AttendanceRecord::where('student_id', $studentId)
            ->whereIn('session_id', $sessionIds)
            ->exists();

        $requiredPercentage = 80.00;
        $reasons = [];

        if ($attendancePercentage < $requiredPercentage) {
            $reasons[] = "Attendance {$attendancePercentage}% is below required {$requiredPercentage}%";
        }
        if (!$schoolFeesCleared) {
            $reasons[] = 'School fees not cleared';
        }
        if (!$attendanceDebtsCleared) {
            $reasons[] = 'Outstanding attendance debts';
        }
        if (!$courseRegistered) {
            $reasons[] = 'Not registered for this course';
        }

        $status = $this->determineStatus($attendancePercentage, $requiredPercentage, $schoolFeesCleared, $attendanceDebtsCleared, $courseRegistered, $reasons);

        $eligibility = AttendanceExamEligibility::updateOrCreate(
            [
                'student_id' => $studentId,
                'course_id' => $courseId,
                'academic_session_id' => now()->year,
                'vu_semester_id' => now()->month <= 6 ? 1 : 2,
            ],
            [
                'eligibility_status_id' => $status->id,
                'attendance_percentage' => $attendancePercentage,
                'required_attendance_percentage' => $requiredPercentage,
                'total_classes' => $adjustedTotal,
                'attended_classes' => $attendedClasses,
                'school_fees_cleared' => $schoolFeesCleared,
                'attendance_debts_cleared' => $attendanceDebtsCleared,
                'course_registered' => $courseRegistered,
                'reasons_json' => $reasons,
                'last_evaluated_at' => now(),
            ]
        );

        AttendanceExamEligibilityLog::create([
            'student_id' => $studentId,
            'course_id' => $courseId,
            'previous_status_id' => $eligibility->getOriginal('eligibility_status_id') ?? $status->id,
            'new_status_id' => $status->id,
            'change_reason' => !empty($reasons) ? implode('; ', $reasons) : 'All requirements satisfied',
        ]);

        return $eligibility;
    }

    private function checkSchoolFees(int $studentId): bool
    {
        try {
            $result = DB::connection('mysql_remote')
                ->table('tuition_fees')
                ->where('student_id', $studentId)
                ->where('payment_status', 'paid')
                ->exists();

            return $result;
        } catch (\Exception) {
            return true;
        }
    }

    private function determineStatus(
        float $attendancePercentage,
        float $requiredPercentage,
        bool $schoolFeesCleared,
        bool $attendanceDebtsCleared,
        bool $courseRegistered,
        array $reasons
    ): AttendanceExamEligibilityStatus {
        $failures = count($reasons);

        if ($failures === 0) {
            return AttendanceExamEligibilityStatus::where('code', 'qualified')->first();
        }

        if ($failures === 1 && !$schoolFeesCleared) {
            return AttendanceExamEligibilityStatus::where('code', 'pending_clearance')->first();
        }

        $hasAttendanceIssue = $attendancePercentage < $requiredPercentage;
        $hasDebtIssue = !$attendanceDebtsCleared || !$schoolFeesCleared;

        if ($hasAttendanceIssue && !$hasDebtIssue) {
            return AttendanceExamEligibilityStatus::where('code', 'attendance_deficiency')->first();
        }

        if ($hasDebtIssue && !$hasAttendanceIssue) {
            return AttendanceExamEligibilityStatus::where('code', 'outstanding_debt')->first();
        }

        return AttendanceExamEligibilityStatus::where('code', 'not_eligible')->first();
    }
}
