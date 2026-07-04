<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStaffRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StaffRoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceStaffRole::query();
        $query->with($this->parseIncludes($request, ['role']));

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
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
            'staff_id' => 'required|integer',
            'attendance_role_id' => 'required|integer|exists:attendance_roles,id',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record = AttendanceStaffRole::create($validator->validated()); return response()->json(['data' => $record, 'message' => 'Staff role assigned successfully.'], 201); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to assign staff role.', 'error' => $e->getMessage()], 500); }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffRole::with($this->parseIncludes($request, ['role']))->find($id);
        if (!$record) return response()->json(['message' => 'Staff role not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffRole::find($id);
        if (!$record) return response()->json(['message' => 'Staff role not found.'], 404);
        $validator = Validator::make($request->all(), [
            'staff_id' => 'sometimes|required|integer',
            'attendance_role_id' => 'sometimes|required|integer|exists:attendance_roles,id',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record->update($validator->validated()); return response()->json(['data' => $record, 'message' => 'Staff role updated successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to update staff role.', 'error' => $e->getMessage()], 500); }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendanceStaffRole::find($id);
        if (!$record) return response()->json(['message' => 'Staff role not found.'], 404);
        try { $record->delete(); return response()->json(['message' => 'Deleted successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to delete staff role.', 'error' => $e->getMessage()], 500); }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceStaffRole::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceStaffRole::withTrashed()->findOrFail($id);
        $model->forceDelete();
        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
