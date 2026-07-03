<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AttendanceRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceRecord::query();

        $includes = $this->parseIncludes($request, ['status', 'session', 'venue', 'session.venue']);
        $query->with($includes);

        if ($request->filled('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
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

        if ($request->filled('attendance_method')) {
            $query->where('attendance_method', $request->attendance_method);
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
        $studentId = $request->student?->id ?? auth()->id();
        $rules = [
            'session_id' => 'required|integer|exists:attendance_sessions,id',
            'status_id' => 'required|integer|exists:attendance_status_types,id',
            'timestamp' => 'required|date_format:Y-m-d H:i:s',
            'attendance_method' => 'required|string|max:50',
            'institutional_event_id' => 'nullable|integer|exists:attendance_institutional_events,id',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'verified_by_terminal_id' => 'nullable|integer|exists:attendance_terminals,id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'liveness_score' => 'nullable|numeric|min:0|max:100',
            'confidence_score' => 'nullable|numeric|min:0|max:100',
        ];

        if ($request->has('records') && is_array($request->records)) {
            $validator = Validator::make($request->all(), [
                'records' => 'required|array',
                'records.*.session_id' => 'required|integer|exists:attendance_sessions,id',
                'records.*.status_id' => 'required|integer|exists:attendance_status_types,id',
                'records.*.timestamp' => 'required|date_format:Y-m-d H:i:s',
                'records.*.attendance_method' => 'required|string|max:50',
                'records.*.venue_id' => 'nullable|integer|exists:attendance_venues,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            try {
                $records = array_map(function ($record) use ($studentId) {
                    $record['student_id'] = $studentId;
                    return $record;
                }, $request->records);
                AttendanceRecord::insert($records);

                return response()->json(['message' => count($request->records) . ' attendance records created successfully.'], 201);
            } catch (\Exception $e) {
                return response()->json(['message' => 'Failed to create attendance records.', 'error' => $e->getMessage()], 500);
            }
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $data['student_id'] = $studentId;
            $record = AttendanceRecord::create($data);
            $record->load(['status', 'session', 'venue']);

            return response()->json(['data' => $record, 'message' => 'Attendance record created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create attendance record.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['status', 'session', 'venue', 'session.venue']);
        $record = AttendanceRecord::with($includes)->find($id);

        if (!$record) {
            return response()->json(['message' => 'Attendance record not found.'], 404);
        }

        return response()->json(['data' => $record]);
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
