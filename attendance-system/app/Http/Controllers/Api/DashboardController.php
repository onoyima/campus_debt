<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceTerminal;
use App\Models\Attendance\AttendanceVenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

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
            $totalStudentsEligible = AttendanceExamEligibility::whereHas('eligibilityStatus', function ($q) {
                $q->where('is_eligible', true);
            })->distinct('student_id')->count('student_id');

            return [
                'venues' => $totalVenues,
                'active_terminals' => $totalActiveTerminals,
                'sessions_today' => $totalSessionsToday,
                'records_today' => $totalRecordsToday,
                'outstanding_debts' => $totalDebtsOutstanding,
                'eligible_students' => $totalStudentsEligible,
            ];
        });

        return response()->json($stats);
    }
}
