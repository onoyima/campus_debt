<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceRole::query();
        $query->with($this->parseIncludes($request, []));

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:attendance_roles',
            'display_name' => 'required|string|max:150',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        try {
            $record = AttendanceRole::create($validator->validated());

            return response()->json(['data' => $record, 'message' => 'Role created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create role.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceRole::with($this->parseIncludes($request, []))->find($id);
        if (! $record) {
            return response()->json(['message' => 'Role not found.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceRole::find($id);
        if (! $record) {
            return response()->json(['message' => 'Role not found.'], 404);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100|unique:attendance_roles,name,'.$id,
            'display_name' => 'sometimes|required|string|max:150',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        try {
            $record->update($validator->validated());

            return response()->json(['data' => $record, 'message' => 'Role updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update role.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendanceRole::find($id);
        if (! $record) {
            return response()->json(['message' => 'Role not found.'], 404);
        }
        try {
            $record->delete();

            return response()->json(['message' => 'Deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete role.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceRole::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceRole::withTrashed()->findOrFail($id);
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
