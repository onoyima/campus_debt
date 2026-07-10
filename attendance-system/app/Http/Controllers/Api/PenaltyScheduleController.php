<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendancePenaltySchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PenaltyScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendancePenaltySchedule::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('applicable_to')) {
            $query->where('applicable_to', $request->applicable_to);
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
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'student_amount' => 'nullable|numeric|min:0',
            'staff_amount' => 'nullable|numeric|min:0',
            'penalty_type' => 'required|string|max:50',
            'applicable_to' => 'required|string|in:student,staff,both',
            'effective_date' => 'required|date',
            'applies_to_late' => 'boolean',
            'applies_to_absence' => 'boolean',
            'description' => 'nullable|string',
            'max_cumulative_amount' => 'nullable|numeric|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        try {
            $record = AttendancePenaltySchedule::create($validator->validated());

            return response()->json(['data' => $record, 'message' => 'Penalty schedule created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create penalty schedule.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendancePenaltySchedule::with($this->parseIncludes($request, []))->find($id);
        if (! $record) {
            return response()->json(['message' => 'Penalty schedule not found.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendancePenaltySchedule::find($id);
        if (! $record) {
            return response()->json(['message' => 'Penalty schedule not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'student_amount' => 'nullable|numeric|min:0',
            'staff_amount' => 'nullable|numeric|min:0',
            'penalty_type' => 'sometimes|required|string|max:50',
            'applicable_to' => 'sometimes|required|string|in:student,staff,both',
            'effective_date' => 'sometimes|required|date',
            'is_active' => 'boolean',
            'applies_to_late' => 'boolean',
            'applies_to_absence' => 'boolean',
            'description' => 'nullable|string',
            'max_cumulative_amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $record->update($validator->validated());

            return response()->json(['data' => $record, 'message' => 'Penalty schedule updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update penalty schedule.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendancePenaltySchedule::find($id);
        if (! $record) {
            return response()->json(['message' => 'Penalty schedule not found.'], 404);
        }
        try {
            $record->delete();

            return response()->json(['message' => 'Deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete penalty schedule.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendancePenaltySchedule::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendancePenaltySchedule::withTrashed()->findOrFail($id);
        $model->forceDelete();

        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        return array_intersect(explode(',', $request->include), $allowed);
    }
}
