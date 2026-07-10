<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Services\AttendanceEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyEventsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $participantType = $user->type === 'student' ? 'student' : 'staff';
        $participantId = $user->type === 'student'
            ? $request->integer('student_id', $user->id)
            : ($user->id ?? $request->integer('staff_id'));

        if (! $participantId) {
            return response()->json(['message' => 'Participant ID required.'], 400);
        }

        $participantEventIds = AttendanceEventParticipant::where('participant_type', $participantType)
            ->where('participant_id', $participantId)
            ->pluck('institutional_event_id');

        $events = AttendanceInstitutionalEvent::with(['targetGroups', 'venue', 'eventCategory'])
            ->whereIn('id', $participantEventIds)
            ->orderBy('start_date', 'desc')
            ->get();

        $service = app(AttendanceEventService::class);
        $results = $events->map(function ($event) use ($service, $participantType, $participantId) {
            $status = $service->getEventAttendanceStatus($event, $participantType, $participantId);
            $windows = $service->getWindows($event);

            return [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'category' => $event->eventCategory?->name,
                'event_type' => $event->event_type,
                'start_date' => $event->start_date,
                'end_date' => $event->end_date,
                'venue_name' => $event->venue?->name,
                'is_mandatory' => $event->is_mandatory,
                'status' => $event->status,
                'is_active' => $event->is_active,
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
