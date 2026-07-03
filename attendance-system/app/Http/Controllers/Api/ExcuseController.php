<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceExcuse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ExcuseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $studentId = $request->student?->id ?? auth()->id();
        $query = AttendanceExcuse::where('student_id', $studentId);
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('excuse_type')) {
            $query->where('excuse_type', $request->excuse_type);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $studentId = $request->student?->id ?? auth()->id();
        $validator = Validator::make($request->all(), [
            'excuse_type' => 'required|string|max:50',
            'reason' => 'required|string',
            'approved_by' => 'required|integer',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try {
            $data = $validator->validated();
            $data['student_id'] = $studentId;
            $record = AttendanceExcuse::create($data);
            return response()->json(['data' => $record, 'message' => 'Excuse recorded successfully.'], 201);
        } catch (\Exception $e) { return response()->json(['message' => 'Failed to record excuse.', 'error' => $e->getMessage()], 500); }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $studentId = $request->student?->id ?? auth()->id();
        $record = AttendanceExcuse::where('student_id', $studentId)->with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Excuse not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $studentId = $request->student?->id ?? auth()->id();
        $record = AttendanceExcuse::where('student_id', $studentId)->find($id);
        if (!$record) return response()->json(['message' => 'Excuse not found.'], 404);
        $validator = Validator::make($request->all(), [
            'excuse_type' => 'sometimes|required|string|max:50',
            'reason' => 'sometimes|required|string',
            'approved_by' => 'sometimes|required|integer',
            'status' => 'sometimes|required|string|max:50',
            'approved_at' => 'nullable|date',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record->update($validator->validated()); return response()->json(['data' => $record, 'message' => 'Excuse updated successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to update excuse.', 'error' => $e->getMessage()], 500); }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $studentId = $request->student?->id ?? auth()->id();
        $record = AttendanceExcuse::where('student_id', $studentId)->find($id);
        if (!$record) return response()->json(['message' => 'Excuse not found.'], 404);
        try { $record->delete(); return response()->json(['message' => 'Deleted successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to delete excuse.', 'error' => $e->getMessage()], 500); }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
