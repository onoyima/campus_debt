<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceSession::query();

        $includes = $this->parseIncludes($request, ['venue', 'records', 'institutionalEvent']);
        $query->with($includes);

        if ($request->filled('from')) {
            $query->whereDate('session_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('session_date', '<=', $request->to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('session_type')) {
            $query->where('session_type', $request->session_type);
        }

        $query->withCount('records');

        $sessions = $query->paginate($perPage);

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $sessions->getCollection()->transform(function ($session) use ($studentId) {
                $totalRecords = $session->records_count;
                $attendedRecords = AttendanceRecord::where('session_id', $session->id)
                    ->where('student_id', $studentId)
                    ->whereHas('status', function ($q) {
                        $q->where('counts_as_present', true);
                    })
                    ->count();
                $session->attendance_percentage = $totalRecords > 0
                    ? round(($attendedRecords / $totalRecords) * 100, 2)
                    : 0;

                return $session;
            });
        }

        return response()->json([
            'data' => $sessions->items(),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'staff_id' => 'required|integer',
            'session_type' => 'required|string|max:50',
            'session_date' => 'required|date',
            'opens_at' => 'required|date_format:Y-m-d H:i:s',
            'closes_at' => 'required|date_format:Y-m-d H:i:s|after:opens_at',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'title' => 'nullable|string|max:255',
            'course_assigned_id' => 'nullable|integer',
            'max_participants' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $session = AttendanceSession::create($validator->validated());
            $session->load('venue');
            $session->loadCount('records');

            return response()->json(['data' => $session, 'message' => 'Session created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['venue', 'records', 'institutionalEvent']);
        $session = AttendanceSession::with($includes)->withCount('records')->find($id);

        if (!$session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $totalRecords = $session->records_count;
            $attendedRecords = AttendanceRecord::where('session_id', $session->id)
                ->where('student_id', $studentId)
                ->whereHas('status', function ($q) {
                    $q->where('counts_as_present', true);
                })
                ->count();
            $session->attendance_percentage = $totalRecords > 0
                ? round(($attendedRecords / $totalRecords) * 100, 2)
                : 0;
        }

        return response()->json(['data' => $session]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $session = AttendanceSession::find($id);

        if (!$session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'staff_id' => 'sometimes|required|integer',
            'session_type' => 'sometimes|required|string|max:50',
            'session_date' => 'sometimes|required|date',
            'opens_at' => 'sometimes|required|date_format:Y-m-d H:i:s',
            'closes_at' => 'sometimes|required|date_format:Y-m-d H:i:s|after:opens_at',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'title' => 'nullable|string|max:255',
            'course_assigned_id' => 'nullable|integer',
            'max_participants' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $session->update($validator->validated());
            $session->load('venue');
            $session->loadCount('records');

            return response()->json(['data' => $session, 'message' => 'Session updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $session = AttendanceSession::find($id);

        if (!$session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        try {
            $session->delete();

            return response()->json(['message' => 'Session deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceSession::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceSession::withTrashed()->findOrFail($id);
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
