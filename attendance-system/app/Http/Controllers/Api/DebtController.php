<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DebtController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceDebt::query();

        $includes = $this->parseIncludes($request, ['debtPayments']);
        $query->with($includes);

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('clearance_status')) {
            $query->where('clearance_status', $request->clearance_status);
        }

        $debts = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $totalOutstanding = AttendanceDebt::where('student_id', $studentId)
                ->where('payment_status', '!=', 'paid')
                ->sum('amount');

            return response()->json([
                'data' => $debts->items(),
                'meta' => [
                    'current_page' => $debts->currentPage(),
                    'last_page' => $debts->lastPage(),
                    'per_page' => $debts->perPage(),
                    'total' => $debts->total(),
                    'total_outstanding' => $totalOutstanding,
                ],
            ]);
        }

        return response()->json([
            'data' => $debts->items(),
            'meta' => [
                'current_page' => $debts->currentPage(),
                'last_page' => $debts->lastPage(),
                'per_page' => $debts->perPage(),
                'total' => $debts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'amount' => 'required|numeric|min:0',
            'reason' => 'required|string|max:500',
            'due_date' => 'required|date',
            'institutional_event_id' => 'nullable|integer|exists:attendance_institutional_events,id',
            'attendance_record_id' => 'nullable|integer|exists:attendance_records,id',
            'payment_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $data['payment_status'] = $data['payment_status'] ?? 'pending';
            $debt = AttendanceDebt::create($data);
            $debt->load('debtPayments');

            return response()->json(['data' => $debt, 'message' => 'Debt recorded successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to record debt.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['debtPayments']);
        $debt = AttendanceDebt::with($includes)->find($id);

        if (!$debt) {
            return response()->json(['message' => 'Debt not found.'], 404);
        }

        return response()->json(['data' => $debt]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $debt = AttendanceDebt::find($id);

        if (!$debt) {
            return response()->json(['message' => 'Debt not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'payment_status' => 'sometimes|required|string|max:50',
            'clearance_status' => 'nullable|string|max:50',
            'cleared_by' => 'nullable|integer',
            'cleared_at' => 'nullable|date',
            'waiver_reason' => 'nullable|string|max:500',
            'waiver_approved_by' => 'nullable|integer',
            'amount' => 'sometimes|required|numeric|min:0',
            'due_date' => 'sometimes|required|date',
            'reason' => 'sometimes|required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $debt->update($validator->validated());
            $debt->load('debtPayments');

            return response()->json(['data' => $debt, 'message' => 'Debt updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update debt.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceDebt::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceDebt::withTrashed()->findOrFail($id);
        $model->forceDelete();
        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) {
            return [];
        }

        $includes = explode(',', $request->include);

        return array_intersect($includes, $allowed);
    }
}
