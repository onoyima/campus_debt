<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventPenaltyAssignment;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EventPenaltyAssignmentController extends Controller
{
    public function index(Request $request, int $eventId): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $assignments = AttendanceEventPenaltyAssignment::where('institutional_event_id', $eventId)
            ->with('penalty')
            ->get();

        return response()->json(['data' => $assignments]);
    }

    public function store(Request $request, int $eventId): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'penalty_ids' => 'required|array|min:1',
            'penalty_ids.*' => 'integer|exists:attendance_penalty_schedule,id',
            'applies_to' => 'required|string|in:absence,late',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $created = 0;
        $skipped = 0;

        foreach ($validator->validated()['penalty_ids'] as $penaltyId) {
            $exists = AttendanceEventPenaltyAssignment::where('institutional_event_id', $eventId)
                ->where('penalty_id', $penaltyId)
                ->where('applies_to', $validator->validated()['applies_to'])
                ->exists();

            if ($exists) {
                $skipped++;

                continue;
            }

            AttendanceEventPenaltyAssignment::create([
                'institutional_event_id' => $eventId,
                'penalty_id' => $penaltyId,
                'applies_to' => $validator->validated()['applies_to'],
            ]);
            $created++;
        }

        $message = "{$created} assignment(s) created.";
        if ($skipped > 0) {
            $message .= " {$skipped} duplicate(s) skipped.";
        }

        return response()->json(['message' => $message], 201);
    }

    public function destroy(int $eventId, int $id): JsonResponse
    {
        $assignment = AttendanceEventPenaltyAssignment::where('institutional_event_id', $eventId)
            ->find($id);

        if (! $assignment) {
            return response()->json(['message' => 'Assignment not found.'], 404);
        }

        $assignment->delete();

        return response()->json(['message' => 'Penalty assignment removed.']);
    }

    public function bulkAssign(Request $request, int $eventId): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'assignments' => 'required|array|min:1',
            'assignments.*.penalty_id' => 'required|integer|exists:attendance_penalty_schedule,id',
            'assignments.*.applies_to' => 'required|string|in:absence,late',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $created = 0;
        $skipped = 0;

        foreach ($validator->validated()['assignments'] as $item) {
            $exists = AttendanceEventPenaltyAssignment::where('institutional_event_id', $eventId)
                ->where('penalty_id', $item['penalty_id'])
                ->where('applies_to', $item['applies_to'])
                ->exists();

            if ($exists) {
                $skipped++;

                continue;
            }

            AttendanceEventPenaltyAssignment::create([
                'institutional_event_id' => $eventId,
                'penalty_id' => $item['penalty_id'],
                'applies_to' => $item['applies_to'],
            ]);
            $created++;
        }

        $message = "{$created} assignment(s) created.";
        if ($skipped > 0) {
            $message .= " {$skipped} duplicate(s) skipped.";
        }

        return response()->json(['message' => $message], 201);
    }
}
