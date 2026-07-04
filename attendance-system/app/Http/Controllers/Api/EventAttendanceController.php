<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EventAttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceEventAttendance::query();

        $includes = $this->parseIncludes($request, ['status', 'institutionalEvent', 'venue']);
        $query->with($includes);

        if ($request->filled('institutional_event_id')) {
            $query->where('institutional_event_id', $request->institutional_event_id);
        }

        if ($request->filled('participant_id')) {
            $query->where('participant_id', $request->participant_id);
        }

        if ($request->filled('participant_type')) {
            $query->where('participant_type', $request->participant_type);
        }

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('timestamp', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('timestamp', '<=', $request->to);
        }

        $records = $query->orderBy('timestamp', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'institutional_event_id' => 'required|integer|exists:attendance_institutional_events,id',
            'participant_type' => 'required|string|max:50',
            'participant_id' => 'required|integer',
            'status_id' => 'required|integer|exists:attendance_status_types,id',
            'timestamp' => 'required|date_format:Y-m-d H:i:s',
            'attendance_method' => 'nullable|string|max:50',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'verified_by_terminal_id' => 'nullable|integer|exists:attendance_terminals,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $attendance = AttendanceEventAttendance::create($validator->validated());
            $attendance->load('status');

            return response()->json(['data' => $attendance, 'message' => 'Event attendance recorded successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to record event attendance.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['status', 'institutionalEvent', 'venue']);
        $attendance = AttendanceEventAttendance::with($includes)->find($id);

        if (!$attendance) {
            return response()->json(['message' => 'Event attendance record not found.'], 404);
        }

        return response()->json(['data' => $attendance]);
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceEventAttendance::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceEventAttendance::withTrashed()->findOrFail($id);
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
