<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceDebtPayment;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentDashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $studentId = $request->integer('student_id');
        if (!$studentId) {
            return response()->json(['message' => 'student_id is required.'], 422);
        }

        $eligibilities = AttendanceExamEligibility::where('student_id', $studentId)
            ->with('eligibilityStatus')
            ->get();
        $totalCourses = $eligibilities->count();
        $eligibilityStatus = $eligibilities->map(function ($e) {
            return [
                'course_id' => $e->course_id,
                'academic_session_id' => $e->academic_session_id,
                'attendance_percentage' => $e->attendance_percentage,
                'required_attendance_percentage' => $e->required_attendance_percentage,
                'is_eligible' => $e->eligibilityStatus?->is_eligible ?? false,
                'school_fees_cleared' => $e->school_fees_cleared,
                'attendance_debts_cleared' => $e->attendance_debts_cleared,
                'exeat_debts_cleared' => $e->exeat_debts_cleared,
                'course_registered' => $e->course_registered,
            ];
        });

        $attendancePercentage = $eligibilities->map(function ($e) {
            return [
                'course_id' => $e->course_id,
                'percentage' => $e->attendance_percentage,
                'required' => $e->required_attendance_percentage,
            ];
        });

        $outstandingDebts = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', '!=', 'paid')
            ->sum('amount');

        $recentAttendance = AttendanceRecord::where('student_id', $studentId)
            ->with(['status', 'session.venue'])
            ->orderBy('timestamp', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'total_courses' => $totalCourses,
                'attendance_percentage' => $attendancePercentage,
                'outstanding_debts_total' => $outstandingDebts,
                'eligibility_status' => $eligibilityStatus,
                'recent_attendance' => $recentAttendance,
            ],
        ]);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
