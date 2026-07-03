<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EventParticipantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceEventParticipant::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('institutional_event_id')) {
            $query->where('institutional_event_id', $request->institutional_event_id);
        }

        if ($request->filled('participant_id')) {
            $query->where('participant_id', $request->participant_id);
        }

        if ($request->filled('participant_type')) {
            $query->where('participant_type', $request->participant_type);
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
            'institutional_event_id' => 'required|integer|exists:attendance_institutional_events,id',
            'participant_type' => 'required|string|max:20',
            'participant_id' => 'required|integer',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);
        try { $record = AttendanceEventParticipant::create($validator->validated()); return response()->json(['data' => $record, 'message' => 'Participant added successfully.'], 201); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to add participant.', 'error' => $e->getMessage()], 500); }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceEventParticipant::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Event participant not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function remove(Request $request, $id): JsonResponse
    {
        $record = AttendanceEventParticipant::find($id);
        if (!$record) return response()->json(['message' => 'Event participant not found.'], 404);
        try { $record->delete(); return response()->json(['message' => 'Participant removed successfully.']); }
        catch (\Exception $e) { return response()->json(['message' => 'Failed to remove participant.', 'error' => $e->getMessage()], 500); }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
