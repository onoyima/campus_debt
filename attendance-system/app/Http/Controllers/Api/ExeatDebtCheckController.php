<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceStudentDebtLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExeatDebtCheckController extends Controller
{
    /**
     * Check if a student has debts blocking exeat
     */
    public function checkStudent(Request $request, $studentId): JsonResponse
    {
        $hasOutstandingDebt = AttendanceDebt::where('student_id', $studentId)
            ->whereIn('payment_status', ['unpaid', 'overdue'])
            ->exists();

        $totalOutstanding = AttendanceDebt::where('student_id', $studentId)
            ->whereIn('payment_status', ['unpaid', 'overdue'])
            ->sum('amount');

        $ledger = AttendanceStudentDebtLedger::where('student_id', $studentId)->first();

        return response()->json([
            'can_submit_exeat' => !$hasOutstandingDebt,
            'blocked' => $hasOutstandingDebt,
            'reason' => $hasOutstandingDebt ? 'outstanding_debts' : null,
            'outstanding_debts' => $totalOutstanding,
            'ledger' => $ledger,
            'student_id' => (int) $studentId,
        ]);
    }
}
