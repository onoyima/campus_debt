<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EventCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceEventCategory::query();
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
            'name' => 'required|string|max:100|unique:attendance_event_categories',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record = AttendanceEventCategory::create($validator->validated()); return response()->json(['data' => $record, 'message' => 'Event category created successfully.'], 201); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to create event category.', 'error' => $e->getMessage()], 500); }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceEventCategory::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Event category not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $record = AttendanceEventCategory::find($id);
        if (!$record) return response()->json(['message' => 'Event category not found.'], 404);
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100|unique:attendance_event_categories,name,' . $id,
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record->update($validator->validated()); return response()->json(['data' => $record, 'message' => 'Event category updated successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to update event category.', 'error' => $e->getMessage()], 500); }
    }

    public function destroy($id): JsonResponse
    {
        $record = AttendanceEventCategory::find($id);
        if (!$record) return response()->json(['message' => 'Event category not found.'], 404);
        try { $record->delete(); return response()->json(['message' => 'Deleted successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to delete event category.', 'error' => $e->getMessage()], 500); }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
