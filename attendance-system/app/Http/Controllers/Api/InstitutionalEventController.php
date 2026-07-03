<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InstitutionalEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceInstitutionalEvent::query();

        $includes = $this->parseIncludes($request, ['category', 'venue', 'participants']);
        $query->with($includes);

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('is_mandatory')) {
            $query->where('is_mandatory', $request->boolean('is_mandatory'));
        }

        if ($request->filled('event_category_id')) {
            $query->where('event_category_id', $request->event_category_id);
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('organizer_id')) {
            $query->where('organizer_id', $request->organizer_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->whereDate('start_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('end_date', '<=', $request->to);
        }

        $query->withCount('participants');

        $events = $query->orderBy('start_date', 'desc')->paginate($perPage);

        $participantId = $request->integer('participant_id');
        if ($participantId) {
            $events->getCollection()->transform(function ($event) use ($participantId) {
                $totalEvents = 1;
                $attendedEvents = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                    ->where('participant_id', $participantId)
                    ->whereHas('status', function ($q) {
                        $q->where('counts_as_present', true);
                    })
                    ->count();
                $event->attendance_data = [
                    'total_events' => $totalEvents,
                    'attended_events' => $attendedEvents,
                    'percentage' => $totalEvents > 0 ? round(($attendedEvents / $totalEvents) * 100, 2) : 0,
                ];

                return $event;
            });
        }

        return response()->json([
            'data' => $events->items(),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'event_category_id' => 'nullable|integer|exists:attendance_event_categories,id',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'organizer_id' => 'required|integer',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'attendance_open_time' => 'required|date_format:Y-m-d H:i:s',
            'attendance_close_time' => 'required|date_format:Y-m-d H:i:s',
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'event_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'grace_period_minutes' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $event = AttendanceInstitutionalEvent::create($validator->validated());
            $event->load(['category', 'venue']);
            $event->loadCount('participants');

            return response()->json(['data' => $event, 'message' => 'Event created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create event.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['category', 'venue', 'participants']);
        $event = AttendanceInstitutionalEvent::with($includes)->withCount('participants')->find($id);

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $participantId = $request->integer('participant_id');
        if ($participantId) {
            $totalEvents = 1;
            $attendedEvents = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('participant_id', $participantId)
                ->whereHas('status', function ($q) {
                    $q->where('counts_as_present', true);
                })
                ->count();
            $event->attendance_data = [
                'total_events' => $totalEvents,
                'attended_events' => $attendedEvents,
                'percentage' => $totalEvents > 0 ? round(($attendedEvents / $totalEvents) * 100, 2) : 0,
            ];
        }

        return response()->json(['data' => $event]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::find($id);

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'event_category_id' => 'nullable|integer|exists:attendance_event_categories,id',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'organizer_id' => 'sometimes|required|integer',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'attendance_open_time' => 'sometimes|required|date_format:Y-m-d H:i:s',
            'attendance_close_time' => 'sometimes|required|date_format:Y-m-d H:i:s',
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'event_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $event->update($validator->validated());
            $event->load(['category', 'venue']);
            $event->loadCount('participants');

            return response()->json(['data' => $event, 'message' => 'Event updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update event.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::find($id);

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        try {
            $event->delete();

            return response()->json(['message' => 'Event deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete event.', 'error' => $e->getMessage()], 500);
        }
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
