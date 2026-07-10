<?php

namespace App\Services;

use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventWindow;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStaffCompliance;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceStudentDebtLedger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EventLifecycleService
{
    public function processActiveEvents(): void
    {
        $now = now();

        $activatedEvents = AttendanceInstitutionalEvent::where('status', 'draft')
            ->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->where('start_date', '<', $now->toDateString())
                    ->orWhere(function ($q2) use ($now) {
                        $q2->whereDate('start_date', '=', $now->toDateString())
                            ->where('attendance_open_time', '<=', $now->format('H:i:s'));
                    });
            })
            ->get();
        $activatedEvents->each(function ($event) {
            $event->update(['status' => 'active']);
            if ($event->targetGroups()->exists()) {
                $enrollmentService = app(EventParticipantEnrollmentService::class);
                $enrollmentService->enrollFromTargetGroups($event);
            }
        });

        // Activate scheduled windows when their open time arrives
        AttendanceEventWindow::where('status', 'scheduled')
            ->where('is_active', true)
            ->where('window_date', '<=', $now->toDateString())
            ->where('attendance_open_time', '<=', $now->format('H:i:s'))
            ->update(['status' => 'active']);

        // Close windows whose close time has passed
        AttendanceEventWindow::where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->where('window_date', '<', $now->toDateString())
                    ->orWhere(function ($q2) use ($now) {
                        $q2->where('window_date', '=', $now->toDateString())
                            ->where('attendance_close_time', '<', $now->format('H:i:s'));
                    });
            })
            ->update(['status' => 'closed']);

        // Auto-close events whose last window has closed
        $activeEvents = AttendanceInstitutionalEvent::where('status', 'active')->get();
        foreach ($activeEvents as $event) {
            $hasOpenWindows = AttendanceEventWindow::where('institutional_event_id', $event->id)
                ->where('status', '!=', 'closed')
                ->exists();

            if (! $hasOpenWindows) {
                // Also check event-level close time for backward compat (events without windows)
                $eventClosed = false;
                if ($event->end_date) {
                    $eventClosed = $now->toDateString() > $event->end_date->format('Y-m-d')
                        || ($now->toDateString() === $event->end_date->format('Y-m-d') && $now->format('H:i:s') > $event->attendance_close_time);
                } else {
                    $eventClosed = $now->toDateString() > $event->start_date->format('Y-m-d')
                        || ($now->toDateString() === $event->start_date->format('Y-m-d') && $now->format('H:i:s') > $event->attendance_close_time);
                }

                if ($eventClosed) {
                    $this->closeEvent($event);
                }
            }
        }

        $activatingSessions = AttendanceSession::where('status', 'scheduled')
            ->where('opens_at', '<=', $now)
            ->get();

        AttendanceSession::where('status', 'scheduled')
            ->where('opens_at', '<=', $now)
            ->update(['status' => 'active']);

        foreach ($activatingSessions as $session) {
            if ($session->course_assigned_id) {
                app(AutoAbsentMarkService::class)->markAbsentForSession($session);
            }
        }

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

        // Mark all enrolled participants without a scan as absent
        $this->markAbsentParticipants($event);

        if ($event->is_mandatory) {
            $this->generatePenaltiesForEvent($event);
        }
    }

    public function markAbsentParticipants(AttendanceInstitutionalEvent $event): int
    {
        $absentStatusId = AttendanceStatusType::where('code', 'absent')->value('id');

        if (! $absentStatusId) {
            return 0;
        }

        $closeTime = $event->attendance_close_time
            ? Carbon::parse($event->start_date->format('Y-m-d').' '.$event->attendance_close_time)
            : Carbon::parse($event->end_date->format('Y-m-d').' 23:59:00');

        $marked = 0;

        $participants = DB::table('attendance_event_participants')
            ->where('institutional_event_id', $event->id)
            ->get(['participant_id', 'participant_type']);

        foreach ($participants as $participant) {
            // Check for REAL scan records — exclude auto_absent placeholders
            $hasRealScan = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('participant_id', $participant->participant_id)
                ->where('participant_type', $participant->participant_type)
                ->where('attendance_method', '!=', 'auto_absent')
                ->exists();

            if ($hasRealScan) {
                continue;
            }

            // Also skip if already marked absent
            $alreadyMarked = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('participant_id', $participant->participant_id)
                ->where('participant_type', $participant->participant_type)
                ->where('status_id', $absentStatusId)
                ->exists();

            if ($alreadyMarked) {
                continue;
            }

            try {
                AttendanceEventAttendance::create([
                    'institutional_event_id' => $event->id,
                    'participant_id' => $participant->participant_id,
                    'participant_type' => $participant->participant_type,
                    'status_id' => $absentStatusId,
                    'attendance_method' => 'auto_absent',
                    'timestamp' => $closeTime,
                    'venue_id' => $event->venue_id,
                    'sync_status' => 'synced',
                    'metadata' => [
                        'auto_marked' => true,
                        'marked_at' => now()->toDateTimeString(),
                        'source' => 'event_close_auto_absent',
                    ],
                ]);
                $marked++;
            } catch (\Exception $e) {
                Log::error("Failed to mark absent for participant {$participant->participant_id} in event {$event->id}: ".$e->getMessage());
            }
        }

        if ($marked > 0) {
            Log::info("Marked {$marked} participants absent for event {$event->id}");
        }

        return $marked;
    }

    public function generatePenaltiesForEvent(AttendanceInstitutionalEvent $event): void
    {
        $penaltyAssignments = $event->penaltyAssignments()->with('penalty')->get();

        if ($penaltyAssignments->isEmpty()) {
            return;
        }

        $absentStatusId = AttendanceStatusType::where('code', 'absent')->value('id');
        $lateStatusId = AttendanceStatusType::where('code', 'late')->value('id');

        $participants = DB::table('attendance_event_participants')
            ->where('institutional_event_id', $event->id)
            ->get(['participant_id', 'participant_type']);

        $attendance = AttendanceEventAttendance::where('institutional_event_id', $event->id)
            ->get()
            ->keyBy(fn ($r) => $r->participant_id.'_'.$r->participant_type);

        foreach ($participants as $participant) {
            $key = $participant->participant_id.'_'.$participant->participant_type;
            $record = $attendance->get($key);

            $isAbsent = ! $record || (int) $record->status_id === $absentStatusId;
            $isLate = $record && (int) $record->status_id === $lateStatusId;

            if ($isAbsent) {
                $this->applyPenalty($event, $participant->participant_id, $participant->participant_type, $penaltyAssignments, 'absence');
            } elseif ($isLate) {
                $this->applyPenalty($event, $participant->participant_id, $participant->participant_type, $penaltyAssignments, 'late');
            }
        }
    }

    private function applyPenalty(
        AttendanceInstitutionalEvent $event,
        int $participantId,
        string $participantType,
        $penaltyAssignments,
        string $type,
    ): void {
        foreach ($penaltyAssignments as $assignment) {
            if ($assignment->applies_to !== $type) {
                continue;
            }

            $penalty = $assignment->penalty;

            if (! $penalty || ! $penalty->is_active) {
                continue;
            }

            // Check if penalty applies to this participant type
            if ($penalty->applicable_to !== 'both' && $penalty->applicable_to !== $participantType) {
                continue;
            }

            // Deduplication: skip if debt already exists for this event+penalty+participant
            $existingQuery = AttendanceDebt::where('institutional_event_id', $event->id)
                ->where('penalty_id', $penalty->id)
                ->where('participant_type', $participantType);

            if ($participantType === 'staff') {
                $existingQuery->where('staff_id', $participantId);
            } else {
                $existingQuery->where('student_id', $participantId);
            }

            if ($existingQuery->exists()) {
                continue;
            }

            $amount = $penalty->getAmountForType($participantType);

            $debtData = [
                'institutional_event_id' => $event->id,
                'penalty_id' => $penalty->id,
                'participant_type' => $participantType,
                'amount' => $amount,
                'reason' => $penalty->name.' ('.$type.') - '.$event->title,
                'due_date' => now()->addDays(30),
                'payment_status' => 'unpaid',
                'clearance_status' => 'pending',
                'blocks_eligibility' => true,
            ];

            if ($participantType === 'staff') {
                $debtData['staff_id'] = $participantId;
            } else {
                $debtData['student_id'] = $participantId;
            }

            try {
                AttendanceDebt::create($debtData);

                if ($participantType === 'student') {
                    $this->updateStudentLedger($participantId);
                }
            } catch (\Exception $e) {
                Log::error("Failed to create {$type} debt for {$participantType} #{$participantId} in event {$event->id}: ".$e->getMessage());
            }
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

            if (! $attended) {
                AttendanceStaffCompliance::create([
                    'staff_id' => $staffId,
                    'institutional_event_id' => $event->id,
                    'reported_to_qa' => true,
                ]);
            }
        }
    }
}
