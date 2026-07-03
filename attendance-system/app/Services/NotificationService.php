<?php

namespace App\Services;

use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceNotification;
use App\Models\Attendance\AttendanceRecord;
use App\Jobs\SendAttendanceNotificationJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function sendDebtNotification(int $studentId, int $debtId): void
    {
        $debt = AttendanceDebt::find($debtId);
        if (!$debt) return;

        $notification = AttendanceNotification::create([
            'recipient_type' => 'student',
            'recipient_id' => $studentId,
            'notification_type' => 'debt_generated',
            'title' => 'New Penalty Applied',
            'message' => "A penalty of {$debt->amount} has been applied for: {$debt->reason}. Due date: {$debt->due_date}.",
            'priority' => 'high',
            'status' => 'pending',
            'action_url' => "/debts?student_id={$studentId}",
        ]);

        SendAttendanceNotificationJob::dispatch($notification->id);
    }

    public function sendEligibilityUpdate(int $studentId, int $courseId): void
    {
        $eligibility = AttendanceExamEligibility::where('student_id', $studentId)
            ->where('course_id', $courseId)
            ->with('eligibilityStatus')
            ->first();

        if (!$eligibility) return;

        $statusName = $eligibility->eligibilityStatus?->display_name ?? 'Unknown';
        $reasons = $eligibility->reasons_json ?? [];

        $notification = AttendanceNotification::create([
            'recipient_type' => 'student',
            'recipient_id' => $studentId,
            'notification_type' => 'eligibility_update',
            'title' => 'Exam Eligibility Updated',
            'message' => "Course {$courseId}: Status changed to {$statusName}." . (!empty($reasons) ? ' Reasons: ' . implode('; ', $reasons) : ''),
            'priority' => 'high',
            'status' => 'pending',
            'action_url' => "/eligibility?student_id={$studentId}",
        ]);

        SendAttendanceNotificationJob::dispatch($notification->id);
    }

    public function sendWeeklyCompliance(int $studentId): ?AttendanceNotification
    {
        $debts = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', 'unpaid')
            ->count();
        $totalOwing = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', 'unpaid')
            ->sum('amount');

        $eligibleCount = AttendanceExamEligibility::where('student_id', $studentId)
            ->whereHas('eligibilityStatus', fn($q) => $q->where('is_eligible', true))
            ->count();
        $ineligibleCount = AttendanceExamEligibility::where('student_id', $studentId)
            ->whereHas('eligibilityStatus', fn($q) => $q->where('is_eligible', false))
            ->count();

        $attendancePct = AttendanceRecord::where('student_id', $studentId)
            ->whereHas('session', fn($q) => $q->where('status', 'closed'))
            ->with('status')
            ->get();

        $present = $attendancePct->filter(fn($r) => $r->status?->counts_as_present)->count();
        $total = $attendancePct->count();
        $pct = $total > 0 ? round(($present / $total) * 100, 1) : 0;

        $notification = AttendanceNotification::create([
            'recipient_type' => 'student',
            'recipient_id' => $studentId,
            'notification_type' => 'weekly_compliance',
            'title' => 'Weekly Attendance Compliance Summary',
            'message' => "Attendance: {$pct}% | Eligible Courses: {$eligibleCount} | Ineligible: {$ineligibleCount} | Outstanding Debts: {$debts} (₦{$totalOwing})",
            'priority' => 'medium',
            'status' => 'pending',
            'action_url' => '/student-dashboard',
        ]);

        SendAttendanceNotificationJob::dispatch($notification->id);

        return $notification;
    }

    public function sendBulkWeeklyCompliance(): int
    {
        $studentIds = AttendanceRecord::distinct()->pluck('student_id');
        $count = 0;

        foreach ($studentIds as $studentId) {
            $notification = $this->sendWeeklyCompliance($studentId);
            if ($notification) $count++;
        }

        Log::info("Weekly compliance: {$count} notifications created");

        return $count;
    }
}
