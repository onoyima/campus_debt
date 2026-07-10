<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceEventUnexpected;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceStaffClocking;
use App\Models\Attendance\AttendanceStatusType;
use App\Services\AttendanceEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffClockingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceStaffClocking::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('clock_type')) {
            $query->where('clock_type', $request->clock_type);
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
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffClocking::with($this->parseIncludes($request, []))->find($id);
        if (! $record) {
            return response()->json(['message' => 'Staff clocking record not found.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function myClockings(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = $request->integer('per_page', 15);
        $page = $request->integer('page', 1);

        // Fetch from attendance_staff_clocking
        $staffClockings = AttendanceStaffClocking::where('staff_id', $user->id)
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => "staff_{$r->id}",
                'clock_type' => $r->clock_type,
                'clocked_at' => $r->clocked_at,
                'attendance_method' => $r->attendance_method,
                'source' => 'staff_clocking',
            ]);

        // Fetch from attendance_event_attendance
        $eventAttendances = AttendanceEventAttendance::where('participant_id', $user->id)
            ->where('participant_type', 'staff')
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => "event_{$r->id}",
                'clock_type' => $r->clock_type,
                'clocked_at' => $r->timestamp,
                'attendance_method' => $r->attendance_method,
                'source' => 'event',
            ]);

        // Fetch from attendance_event_unexpected
        $unexpected = AttendanceEventUnexpected::where('participant_id', $user->id)
            ->where('participant_type', 'staff')
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => "unexpected_{$r->id}",
                'clock_type' => 'in',
                'clocked_at' => $r->timestamp,
                'attendance_method' => $r->attendance_method,
                'source' => 'unexpected',
            ]);

        // Merge and sort
        $all = $staffClockings
            ->concat($eventAttendances)
            ->concat($unexpected)
            ->sortByDesc('clocked_at')
            ->values();

        $total = $all->count();
        $items = $all->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        $staffId = $user->id;

        // Events where staff is a registered participant
        $registeredEventIds = AttendanceEventParticipant::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->pluck('institutional_event_id');

        $totalEventsRegistered = $registeredEventIds->count();

        // Events actually attended (has at least one 'in' clocking)
        $attendedEventIds = AttendanceEventAttendance::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->where('clock_type', 'in')
            ->distinct('institutional_event_id')
            ->pluck('institutional_event_id');

        $totalEventsAttended = $attendedEventIds->count();

        // Overall attendance percentage
        $attendancePercentage = $totalEventsRegistered > 0
            ? round(($totalEventsAttended / $totalEventsRegistered) * 100, 1)
            : 0;

        // Today's clockings
        $todayClockings = AttendanceStaffClocking::where('staff_id', $staffId)
            ->whereDate('timestamp', today())
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(fn ($c) => [
                'id' => "staff_{$c->id}",
                'clock_type' => $c->clock_type,
                'clocked_at' => $c->clocked_at,
                'attendance_method' => $c->attendance_method,
            ]);

        // Today's event attendance
        $todayEventAttendance = AttendanceEventAttendance::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->whereDate('timestamp', today())
            ->with('institutionalEvent')
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(fn ($ea) => [
                'id' => "event_{$ea->id}",
                'clock_type' => $ea->clock_type,
                'clocked_at' => $ea->timestamp,
                'attendance_method' => $ea->attendance_method,
                'event_title' => $ea->institutionalEvent?->title,
            ]);

        // Recent event participations (last 10)
        $recentEvents = AttendanceEventAttendance::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->with('institutionalEvent')
            ->orderBy('timestamp', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($ea) => [
                'id' => $ea->id,
                'event_id' => $ea->institutional_event_id,
                'event_title' => $ea->institutionalEvent?->title ?? "Event #{$ea->institutional_event_id}",
                'clock_type' => $ea->clock_type,
                'clocked_at' => $ea->timestamp,
                'venue_id' => $ea->venue_id,
            ]);

        // Upcoming events (future or active)
        $upcomingEvents = AttendanceInstitutionalEvent::whereIn('id', $registeredEventIds)
            ->where(function ($q) {
                $q->whereDate('start_date', '>=', today())
                    ->orWhere('is_active', true);
            })
            ->count();

        // Absences — registered events not attended
        $absentEvents = AttendanceInstitutionalEvent::whereIn('id', $registeredEventIds)
            ->whereNotIn('id', $attendedEventIds)
            ->with('venue')
            ->orderBy('start_date', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'title' => $e->title,
                'start_date' => $e->start_date,
                'venue_name' => $e->venue?->name,
                'status' => $e->status,
            ]);

        // Registered events with details
        $registeredEvents = AttendanceInstitutionalEvent::whereIn('id', $registeredEventIds)
            ->with('venue')
            ->orderBy('start_date', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'title' => $e->title,
                'start_date' => $e->start_date,
                'end_date' => $e->end_date,
                'venue_name' => $e->venue?->name,
                'status' => $e->status,
                'is_active' => $e->is_active,
                'attended' => $attendedEventIds->contains($e->id),
            ]);

        // Unexpected clockings (where staff clocked but wasn't registered)
        $unexpectedCount = AttendanceEventUnexpected::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->count();

        return response()->json([
            'data' => [
                'total_events_registered' => $totalEventsRegistered,
                'total_events_attended' => $totalEventsAttended,
                'upcoming_events' => $upcomingEvents,
                'attendance_percentage' => $attendancePercentage,
                'today_clockings' => $todayClockings,
                'today_event_attendance' => $todayEventAttendance,
                'unexpected_clockings' => $unexpectedCount,
                'recent_events' => $recentEvents,
                'registered_events' => $registeredEvents,
                'absences' => $absentEvents,
            ],
        ]);
    }

    public function clockIn(Request $request): JsonResponse
    {
        $user = $request->user();
        $now = now();

        $activeEvent = $this->findActiveEvent();

        if ($activeEvent) {
            return $this->routeToEvent($user->id, 'in', $activeEvent, $now);
        }

        $record = AttendanceStaffClocking::create([
            'staff_id' => $user->id,
            'clock_type' => 'in',
            'attendance_method' => 'manual',
            'timestamp' => $now,
        ]);

        return response()->json(['data' => $record, 'message' => 'Clocked in successfully.'], 201);
    }

    public function clockOut(Request $request): JsonResponse
    {
        $user = $request->user();
        $now = now();

        $activeEvent = $this->findActiveEvent();

        if ($activeEvent) {
            return $this->routeToEvent($user->id, 'out', $activeEvent, $now);
        }

        $record = AttendanceStaffClocking::create([
            'staff_id' => $user->id,
            'clock_type' => 'out',
            'attendance_method' => 'manual',
            'timestamp' => $now,
        ]);

        return response()->json(['data' => $record, 'message' => 'Clocked out successfully.'], 201);
    }

    private function findActiveEvent(): ?AttendanceInstitutionalEvent
    {
        $now = now();

        return AttendanceInstitutionalEvent::where('is_active', true)
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->where(function ($q2) use ($now) {
                    $q2->where('attendance_open_time', '<=', $now->format('H:i:s'))
                        ->where('attendance_close_time', '>=', $now->format('H:i:s'));
                })->orWhere(function ($q2) use ($now) {
                    $q2->whereNotNull('clock_out_open_time')
                        ->whereNotNull('clock_out_close_time')
                        ->where('clock_out_open_time', '<=', $now->format('H:i:s'))
                        ->where('clock_out_close_time', '>=', $now->format('H:i:s'));
                });
            })
            ->with('participants')
            ->orderBy('attendance_open_time')
            ->first();
    }

    private function routeToEvent(int $staffId, string $clockType, AttendanceInstitutionalEvent $event, $now): JsonResponse
    {
        $isParticipant = $event->participants->contains(
            fn ($p) => (int) $p->participant_id === $staffId
        );

        $defaultStatus = AttendanceStatusType::where('code', 'present')->value('id');

        if ($isParticipant) {
            $record = AttendanceEventAttendance::create([
                'institutional_event_id' => $event->id,
                'participant_type' => 'staff',
                'participant_id' => $staffId,
                'status_id' => $defaultStatus ?? 1,
                'attendance_method' => 'manual',
                'clock_type' => $clockType,
                'timestamp' => $now,
                'venue_id' => $event->venue_id,
                'sync_status' => 'synced',
            ]);

            return response()->json([
                'data' => $record,
                'message' => 'Event attendance recorded as participant.',
            ], 201);
        }

        $expectedType = $this->expectedParticipantType($event);
        $record = AttendanceEventUnexpected::create([
            'institutional_event_id' => $event->id,
            'participant_type' => 'staff',
            'participant_id' => $staffId,
            'expected_participant_type' => $expectedType,
            'reason' => 'not_a_participant',
            'attendance_method' => 'manual',
            'timestamp' => $now,
            'venue_id' => $event->venue_id,
            'sync_status' => 'synced',
        ]);

        return response()->json([
            'data' => $record,
            'message' => 'Clocking recorded — you are not a registered participant for the active event.',
        ], 201);
    }

    private function expectedParticipantType(AttendanceInstitutionalEvent $event): string
    {
        if ($event->participants->isEmpty()) {
            return 'any';
        }
        $types = $event->participants->pluck('participant_type')->unique()->values();

        return $types->count() === 1 ? $types->first() : 'any';
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceStaffClocking::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceStaffClocking::withTrashed()->findOrFail($id);
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

    public function myEvents(Request $request): JsonResponse
    {
        $user = $request->user();
        $staffId = $user->id ?? $request->integer('staff_id');
        if (! $staffId) {
            return response()->json(['message' => 'Staff ID required.'], 400);
        }

        $participantEventIds = AttendanceEventParticipant::where('participant_type', 'staff')
            ->where('participant_id', $staffId)
            ->pluck('institutional_event_id');

        $events = AttendanceInstitutionalEvent::with(['targetGroups', 'venue'])
            ->whereIn('id', $participantEventIds)
            ->orderBy('start_date', 'desc')
            ->get();

        $service = app(AttendanceEventService::class);
        $results = $events->map(function ($event) use ($service, $staffId) {
            $status = $service->getEventAttendanceStatus($event, 'staff', $staffId);
            $windows = $service->getWindows($event);

            return [
                'id' => $event->id,
                'title' => $event->title,
                'start_date' => $event->start_date,
                'end_date' => $event->end_date,
                'venue_name' => $event->venue?->name,
                'is_mandatory' => $event->is_mandatory,
                'status' => $event->status,
                'attendance_status' => $status['status'],
                'check_in_time' => $status['check_in']?->timestamp,
                'check_out_time' => $status['check_out']?->timestamp,
                'windows' => [
                    'check_in_open' => $windows['check_in_open']->toDateTimeString(),
                    'check_in_close' => $windows['check_in_close']->toDateTimeString(),
                    'late_check_in_open' => $windows['late_check_in_open']->toDateTimeString(),
                    'late_check_in_close' => $windows['late_check_in_close']->toDateTimeString(),
                    'check_out_open' => $windows['check_out_open']->toDateTimeString(),
                    'check_out_close' => $windows['check_out_close']->toDateTimeString(),
                ],
            ];
        });

        return response()->json(['data' => $results]);
    }
}
