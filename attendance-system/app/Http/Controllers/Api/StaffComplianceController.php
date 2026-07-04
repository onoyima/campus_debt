<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStaffCompliance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StaffComplianceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceStaffCompliance::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('institutional_event_id')) {
            $query->where('institutional_event_id', $request->institutional_event_id);
        }

        if ($request->filled('reported_to_qa')) {
            $query->where('reported_to_qa', $request->boolean('reported_to_qa'));
        }

        if ($request->filled('deduction_processed')) {
            $query->where('deduction_processed', $request->boolean('deduction_processed'));
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffCompliance::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Staff compliance record not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffCompliance::find($id);
        if (!$record) return response()->json(['message' => 'Staff compliance record not found.'], 404);
        $validator = Validator::make($request->all(), [
            'reported_to_qa' => 'boolean',
            'qa_reported_at' => 'nullable|date',
            'deduction_processed' => 'boolean',
            'deduction_processed_at' => 'nullable|date',
            'compliance_status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record->update($validator->validated()); return response()->json(['data' => $record, 'message' => 'Staff compliance updated successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to update staff compliance.', 'error' => $e->getMessage()], 500); }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceStaffCompliance::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceStaffCompliance::withTrashed()->findOrFail($id);
        $model->forceDelete();
        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
