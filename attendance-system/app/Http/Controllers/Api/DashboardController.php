<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStaffClocking;
use App\Models\Attendance\AttendanceTerminal;
use App\Models\Attendance\AttendanceVenue;
use App\Models\Portal\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $ttl = 10;

        $stats = Cache::remember('dashboard.stats', $ttl, function () {
            $totalVenues = AttendanceVenue::count();
            $totalActiveTerminals = AttendanceTerminal::where('is_active', true)->count();
            $totalSessionsToday = AttendanceSession::whereDate('session_date', today())->count();
            $totalRecordsToday = AttendanceRecord::whereDate('created_at', today())->count();
            $totalDebtsOutstanding = AttendanceDebt::where('payment_status', 'unpaid')->count();
            $totalDebtAmount = AttendanceDebt::where('payment_status', 'unpaid')->sum('amount') ?? 0;
            $totalStudentsEligible = AttendanceExamEligibility::whereHas('eligibilityStatus', function ($q) {
                $q->where('is_eligible', true);
            })->distinct('student_id')->count('student_id');
            $totalStudents = Student::count();

            return [
                'venues' => $totalVenues,
                'active_terminals' => $totalActiveTerminals,
                'sessions_today' => $totalSessionsToday,
                'records_today' => $totalRecordsToday,
                'outstanding_debts' => $totalDebtsOutstanding,
                'outstanding_debt_amount' => $totalDebtAmount,
                'eligible_students' => $totalStudentsEligible,
                'total_students' => $totalStudents,
            ];
        });

        // Recent activities — last 10 attendance records across all sources
        $recentActivities = $this->buildRecentActivities();

        // System health checks
        $systemHealth = $this->buildSystemHealth();

        return response()->json(array_merge($stats, [
            'recent_activities' => $recentActivities,
            'system_health' => $systemHealth,
        ]));
    }

    private function buildRecentActivities(): array
    {
        $activities = [];

        // Attendance records
        $records = AttendanceRecord::with(['status'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        foreach ($records as $r) {
            $activities[] = [
                'type' => 'attendance',
                'label' => "Student #{$r->student_id}",
                'description' => "Attendance recorded — {$r->status?->label}",
                'created_at' => $r->created_at?->diffForHumans(),
            ];
        }

        // Staff clockings
        $clockings = AttendanceStaffClocking::orderBy('timestamp', 'desc')
            ->limit(3)
            ->get();

        foreach ($clockings as $c) {
            $activities[] = [
                'type' => 'staff_clocking',
                'label' => "Staff #{$c->staff_id}",
                'description' => "Clocked {$c->clock_type}",
                'created_at' => $c->timestamp?->diffForHumans(),
            ];
        }

        // Event attendances
        $eventAttendances = AttendanceEventAttendance::with(['event'])
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($eventAttendances as $ea) {
            $activities[] = [
                'type' => 'event_attendance',
                'label' => $ea->event?->title ?? "Event #{$ea->institutional_event_id}",
                'description' => "Participant {$ea->participant_id} — {$ea->clock_type}",
                'created_at' => $ea->created_at?->diffForHumans(),
            ];
        }

        // Sort by time descending and take top 10
        usort($activities, function ($a, $b) {
            return $b['created_at'] <=> $a['created_at'];
        });

        return array_slice($activities, 0, 10);
    }

    private function buildSystemHealth(): array
    {
        $dbConnected = true;
        try {
            DB::connection()->getPdo();
        } catch (\Exception) {
            $dbConnected = false;
        }

        $activeTerminals = AttendanceTerminal::where('is_active', true)->count();
        $totalTerminals = AttendanceTerminal::count();

        $pendingSync = DB::table('attendance_offline_pending_sync')->count();

        return [
            'api' => ['status' => 'Operational', 'healthy' => true],
            'database' => ['status' => $dbConnected ? 'Connected' : 'Disconnected', 'healthy' => $dbConnected],
            'biometrics' => [
                'status' => $activeTerminals > 0 ? "{$activeTerminals}/{$totalTerminals} Online" : 'Offline',
                'healthy' => $activeTerminals > 0,
            ],
            'sync' => [
                'status' => $pendingSync > 0 ? "{$pendingSync} pending" : 'Active',
                'healthy' => $pendingSync === 0,
            ],
        ];
    }
}
