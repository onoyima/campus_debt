<?php

namespace App\Services;

use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceNotification;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStaffCompliance;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceStudentDebtLedger;
use Illuminate\Support\Facades\DB;

class EventLifecycleService
{
    public function processActiveEvents(): void
    {
        $now = now();

        AttendanceInstitutionalEvent::where('status', 'draft')
            ->where('start_date', '<=', $now->toDateString())
            ->where('is_active', true)
            ->update(['status' => 'active']);

        AttendanceInstitutionalEvent::where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->where('end_date', '<', $now->toDateString())
                    ->orWhere(function ($q2) use ($now) {
                        $q2->whereDate('end_date', '=', $now->toDateString())
                            ->where('attendance_close_time', '<', $now->format('H:i:s'));
                    });
            })
            ->get()
            ->each(function ($event) {
                $this->closeEvent($event);
            });

        AttendanceSession::where('status', 'scheduled')
            ->where('opens_at', '<=', $now)
            ->update(['status' => 'active']);

        AttendanceSession::where('status', 'active')
            ->where('closes_at', '<=', $now)
            ->update(['status' => 'closed']);
    }

    public function closeEvent(AttendanceInstitutionalEvent $event): void
    {
        $event->update(['status' => 'completed']);

        AttendanceSession::where('institutional_event_id', $event->id)
            ->where('status', 'active')
            ->update(['status' => 'closed']);

        if ($event->is_mandatory) {
            $this->generatePenaltiesForEvent($event);
        }
    }

    public function generatePenaltiesForEvent(AttendanceInstitutionalEvent $event): void
    {
        $penaltyAssignments = $event->penaltyAssignments;

        if ($penaltyAssignments->isEmpty()) {
            return;
        }

        $absentStatusId = AttendanceStatusType::where('code', 'absent')->value('id');
        $lateStatusId = AttendanceStatusType::where('code', 'late')->value('id');

        $participants = DB::table('attendance_event_participants')
            ->where('institutional_event_id', $event->id)
            ->where('participant_type', 'student')
            ->pluck('participant_id');

        $attended = AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->where('participant_type', 'student')
            ->get()
            ->keyBy('participant_id');

        foreach ($participants as $studentId) {
            $record = $attended->get($studentId);

            if (!$record) {
                $this->applyPenalty($event, $studentId, $penaltyAssignments, 'absence');
            } elseif ($record->status_id === $lateStatusId) {
                $this->applyPenalty($event, $studentId, $penaltyAssignments, 'late');
            }
        }
    }

    private function applyPenalty(AttendanceInstitutionalEvent $event, int $studentId, $penaltyAssignments, string $type): void
    {
        foreach ($penaltyAssignments as $assignment) {
            if ($assignment->applies_to !== $type) {
                continue;
            }

            $penalty = $assignment->penalty;

            if (!$penalty || !$penalty->is_active) {
                continue;
            }

            $existingDebt = AttendanceDebt::where('student_id', $studentId)
                ->where('institutional_event_id', $event->id)
                ->where('penalty_id', $penalty->id)
                ->exists();

            if ($existingDebt) {
                continue;
            }

            AttendanceDebt::create([
                'student_id' => $studentId,
                'institutional_event_id' => $event->id,
                'penalty_id' => $penalty->id,
                'amount' => $penalty->amount,
                'reason' => $penalty->name . ' - ' . $event->title,
                'due_date' => now()->addDays(30),
                'payment_status' => 'unpaid',
                'clearance_status' => 'pending',
            ]);

            $this->updateStudentLedger($studentId);
        }
    }

    public function updateStudentLedger(int $studentId): void
    {
        $totalOutstanding = AttendanceDebt::where('student_id', $studentId)
            ->whereIn('payment_status', ['unpaid', 'overdue'])
            ->sum('amount');
        $totalPaid = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', 'paid')
            ->sum('amount');
        $totalCleared = AttendanceDebt::where('student_id', $studentId)
            ->where('clearance_status', 'cleared')
            ->sum('amount');

        AttendanceStudentDebtLedger::updateOrCreate(
            ['student_id' => $studentId],
            [
                'total_outstanding' => $totalOutstanding,
                'total_paid' => $totalPaid,
                'total_cleared' => $totalCleared,
                'last_calculated_at' => now(),
            ]
        );
    }

    public function generateStaffCompliance(AttendanceInstitutionalEvent $event): void
    {
        $participants = DB::table('attendance_event_participants')
            ->where('institutional_event_id', $event->id)
            ->where('participant_type', 'staff')
            ->pluck('participant_id');

        $presentStatusId = AttendanceStatusType::where('code', 'present')->value('id');

        foreach ($participants as $staffId) {
            $attended = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('participant_id', $staffId)
                ->where('participant_type', 'staff')
                ->where('status_id', $presentStatusId)
                ->exists();

            if (!$attended) {
                AttendanceStaffCompliance::create([
                    'staff_id' => $staffId,
                    'institutional_event_id' => $event->id,
                    'reported_to_qa' => true,
                ]);
            }
        }
    }
}
