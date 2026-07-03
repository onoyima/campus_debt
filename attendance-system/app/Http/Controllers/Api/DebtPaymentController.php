<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebtPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DebtPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceDebtPayment::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('attendance_debt_id')) {
            $query->where('attendance_debt_id', $request->attendance_debt_id);
        }

        if ($request->filled('verified_by')) {
            $query->where('verified_by', $request->verified_by);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'attendance_debt_id' => 'required|integer|exists:attendance_debts,id',
            'amount' => 'required|numeric|min:0',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record = AttendanceDebtPayment::create($validator->validated()); return response()->json(['data' => $record, 'message' => 'Debt payment recorded successfully.'], 201); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to record debt payment.', 'error' => $e->getMessage()], 500); }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceDebtPayment::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Debt payment not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceDebtPayment::find($id);
        if (!$record) return response()->json(['message' => 'Debt payment not found.'], 404);
        $validator = Validator::make($request->all(), [
            'attendance_debt_id' => 'sometimes|required|integer|exists:attendance_debts,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'verified_by' => 'nullable|integer',
            'verified_at' => 'nullable|date',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record->update($validator->validated()); return response()->json(['data' => $record, 'message' => 'Debt payment updated successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to update debt payment.', 'error' => $e->getMessage()], 500); }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendanceDebtPayment::find($id);
        if (!$record) return response()->json(['message' => 'Debt payment not found.'], 404);
        try { $record->delete(); return response()->json(['message' => 'Deleted successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to delete debt payment.', 'error' => $e->getMessage()], 500); }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
