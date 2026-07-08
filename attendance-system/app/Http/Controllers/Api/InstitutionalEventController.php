<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventTargetGroup;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceTerminal;
use App\Services\AttendanceEventService;
use App\Services\EventParticipantEnrollmentService;
use Illuminate\Support\Facades\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InstitutionalEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceInstitutionalEvent::query();

        $includes = $this->parseIncludes($request, ['eventCategory', 'venue', 'participants', 'targetGroups']);
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

    /**
     * Terminal-facing: get active events for a terminal's venue
     */
    public function current(Request $request): JsonResponse
    {
        $terminalId = $request->input('terminal_id');
        $terminal = null;

        if ($terminalId) {
            $terminal = AttendanceTerminal::find($terminalId);
        } elseif ($request->attributes->has('authenticated_terminal')) {
            $terminal = $request->attributes->get('authenticated_terminal');
        }

        $venueId = $terminal?->venue_id;
        $now = now();
        $today = $now->format('Y-m-d');

        $query = AttendanceInstitutionalEvent::where('is_active', true)
            ->where('status', 'active')
            // Must be active on today's date (start_date <= today <= end_date)
            ->where('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                   ->orWhere('end_date', '>=', $today);
            })
            // Must have a clock window open right now
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
            });

        if ($venueId && !($terminal?->allow_any_venue)) {
            $query->where(function ($q) use ($venueId, $terminalId) {
                $q->where('venue_id', $venueId)
                  ->orWhereHas('assignedTerminals', function ($q2) use ($terminalId) {
                      $q2->where('attendance_terminals.id', $terminalId);
                  });
            });
        } elseif ($terminalId && $terminal?->allow_any_venue) {
            $query->where(function ($q) use ($terminalId) {
                $q->whereNull('venue_id')
                  ->orWhereHas('assignedTerminals', function ($q2) use ($terminalId) {
                      $q2->where('attendance_terminals.id', $terminalId);
                  });
            });
        }

        $events = $query->with(['participants', 'venue', 'assignedTerminals'])->orderBy('attendance_open_time')->get();

        return response()->json(['data' => $events]);
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
            'attendance_open_time' => 'required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'attendance_close_time' => 'required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_in_open_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_out_open_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_out_close_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'event_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'grace_period_minutes' => 'nullable|integer|min:0',
            'target_audience' => 'nullable|array',
            'target_audience.*.target_type' => 'required|string|max:50',
            'target_audience.*.target_id' => 'nullable|integer',
            'terminal_ids' => 'nullable|array',
            'terminal_ids.*' => 'integer|exists:attendance_terminals,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $terminalIds = $data['terminal_ids'] ?? [];
            unset($data['terminal_ids']);
            $event = AttendanceInstitutionalEvent::create($data);

            if ($request->has('target_audience')) {
                $event->targetGroups()->delete();
                foreach ($request->target_audience as $ta) {
                    AttendanceEventTargetGroup::create([
                        'institutional_event_id' => $event->id,
                        'target_type' => $ta['target_type'],
                        'target_id' => $ta['target_id'] ?? null,
                    ]);
                }
            }

            if (!empty($terminalIds)) {
                $event->assignedTerminals()->sync($terminalIds);
            }

            $event->load(['eventCategory', 'venue', 'targetGroups', 'assignedTerminals']);
            $event->loadCount('participants');

            return response()->json(['data' => $event, 'message' => 'Event created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create event.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['eventCategory', 'venue', 'participants', 'targetGroups', 'assignedTerminals']);
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
            'attendance_open_time' => 'sometimes|required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'attendance_close_time' => 'sometimes|required|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_in_open_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_out_open_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'clock_out_close_time' => 'nullable|regex:/^\d{2}:\d{2}(:\d{2})?$/',
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'event_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'target_audience' => 'nullable|array',
            'target_audience.*.target_type' => 'required|string|max:50',
            'target_audience.*.target_id' => 'nullable|integer',
            'terminal_ids' => 'nullable|array',
            'terminal_ids.*' => 'integer|exists:attendance_terminals,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $terminalIds = $data['terminal_ids'] ?? [];
            unset($data['terminal_ids']);
            $event->update($data);

            if ($request->has('target_audience')) {
                $event->targetGroups()->delete();
                foreach ($request->target_audience as $ta) {
                    AttendanceEventTargetGroup::create([
                        'institutional_event_id' => $event->id,
                        'target_type' => $ta['target_type'],
                        'target_id' => $ta['target_id'] ?? null,
                    ]);
                }
            }

            if ($request->has('terminal_ids')) {
                $event->assignedTerminals()->sync($terminalIds);
            }

            $event->load(['eventCategory', 'venue', 'targetGroups', 'assignedTerminals']);
            $event->loadCount('participants');

            return response()->json(['data' => $event, 'message' => 'Event updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update event.', 'error' => $e->getMessage()], 500);
        }
    }

    public function attendanceReport(Request $request, $id): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::with(['targetGroups', 'venue', 'assignedTerminals'])->find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $service = app(AttendanceEventService::class);
        $report = $service->buildAttendanceReport($event);

        $targetAudienceLabels = $event->targetGroups->map(fn($g) => [
            'target_type' => $g->target_type,
            'target_id' => $g->target_id,
            'label' => str_replace('_', ' ', ucwords($g->target_type, '_')) . ($g->target_id ? " #{$g->target_id}" : ''),
        ]);

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 20);
        $search = $request->search;
        $statusFilter = $request->status;
        $typeFilter = $request->participant_type;

        $allItems = collect(array_merge($report['breakdown'], $report['visitors'] ?? []));

        if ($search) {
            $allItems = $allItems->filter(function ($item) use ($service, $search) {
                $info = $service->resolveParticipantInfo($item['participant_id'], $item['participant_type']);
                return str_contains(strtolower($info['name']), strtolower($search))
                    || str_contains((string) $item['participant_id'], $search)
                    || str_contains(strtolower($info['department'] ?? ''), strtolower($search));
            });
        }

        if ($statusFilter) {
            $allItems = $allItems->where('status', $statusFilter);
        }

        if ($typeFilter) {
            $allItems = $allItems->where('participant_type', $typeFilter);
        }

        $total = $allItems->count();
        $paginated = $allItems->forPage($page, $perPage)->values();
        $paginated = $paginated->map(fn($item) => array_merge(
            $item,
            $service->resolveParticipantInfo($item['participant_id'], $item['participant_type'])
        ));

        $visitorCount = count($report['visitors'] ?? []);

        return response()->json([
            'data' => [
                'event' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'start_date' => $event->start_date,
                    'end_date' => $event->end_date,
                    'venue_name' => $event->venue?->name,
                    'assigned_terminals' => $event->assignedTerminals->map(fn($t) => [
                        'id' => $t->id,
                        'device_id' => $t->device_id,
                        'name' => $t->device_id,
                    ]),
                ],
                'target_audience' => $targetAudienceLabels,
                'expected_participants' => $report['expected_participants'],
                'present' => $report['present'],
                'late' => $report['late'],
                'absent' => $report['absent'],
                'pending' => $report['pending'],
                'total_attended' => $report['total_attended'],
                'visitor_count' => $visitorCount,
                'attendance_rate' => $report['attendance_rate'],
                'breakdown' => $paginated,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => max(1, (int) ceil($total / $perPage)),
                ],
            ],
        ]);
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

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceInstitutionalEvent::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceInstitutionalEvent::withTrashed()->findOrFail($id);
        $model->forceDelete();
        return response()->json(['message' => 'Permanently deleted.']);
    }

    public function exportAttendance(Request $request, $id)
    {
        $event = AttendanceInstitutionalEvent::with(['targetGroups', 'venue'])->find($id);
        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $service = app(AttendanceEventService::class);
        $report = $service->buildAttendanceReport($event);
        $format = $request->format ?? 'csv';

        $statusFilter = $request->status;
        $typeFilter = $request->participant_type;

        $breakdown = collect(array_merge($report['breakdown'], $report['visitors'] ?? []));

        if ($statusFilter) {
            $breakdown = $breakdown->where('status', $statusFilter);
        }
        if ($typeFilter) {
            $breakdown = $breakdown->where('participant_type', $typeFilter);
        }

        $rows = $breakdown->map(function ($item) use ($service) {
            $info = $service->resolveParticipantInfo($item['participant_id'], $item['participant_type']);
            return [
                'Participant ID' => $item['participant_id'],
                'Name' => $info['name'],
                'Type' => ucfirst($item['participant_type']),
                'Department' => $info['department'] ?? '',
                'Faculty' => $info['faculty'] ?? '',
                'Status' => ucfirst($item['status']),
                'Check-in Time' => $item['check_in_time'] ?? '',
                'Check-out Time' => $item['check_out_time'] ?? '',
            ];
        });

        $filename = 'attendance-' . str_replace(' ', '-', $event->title) . '-' . $event->start_date->format('Y-m-d');

        return match ($format) {
            'csv' => $this->exportCsv($rows, $filename . '.csv'),
            'xlsx' => $this->exportXlsx($rows, $filename . '.xlsx', $event, $report),
            'pdf' => $this->exportPdf($rows, $filename . '.pdf', $event, $report),
            default => $this->exportCsv($rows, $filename . '.csv'),
        };
    }

    private function exportCsv($rows, $filename)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            if ($rows->isNotEmpty()) {
                fputcsv($handle, array_keys($rows->first()));
                foreach ($rows as $row) {
                    fputcsv($handle, $row);
                }
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportXlsx($rows, $filename, $event, $report)
    {
        $html = $this->buildExportHtml($rows, $event, $report);
        $html = str_replace('<table>', '<table xmlns:x="urn:schemas-microsoft-com:office:excel">', $html);

        return response($html, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    private function exportPdf($rows, $filename, $event, $report)
    {
        $html = $this->buildExportHtml($rows, $event, $report);

        $pdf = new \Dompdf\Dompdf();
        $pdf->loadHtml($html);
        $pdf->setPaper('A4', 'landscape');
        $pdf->render();

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    private function buildExportHtml($rows, $event, $report): string
    {
        $title = htmlspecialchars($event->title);
        $date = $event->start_date->format('F j, Y');
        $venue = htmlspecialchars($event->venue?->name ?? 'N/A');

        $rowsHtml = '';
        foreach ($rows as $row) {
            $rowsHtml .= '<tr>';
            foreach ($row as $cell) {
                $rowsHtml .= '<td>' . htmlspecialchars($cell) . '</td>';
            }
            $rowsHtml .= '</tr>';
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body { font-family: Arial, sans-serif; margin: 20px; }
h1 { color: #333; font-size: 18px; margin-bottom: 4px; }
.summary { margin-bottom: 16px; font-size: 13px; color: #555; }
.summary strong { color: #333; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { background: #1a365d; color: white; padding: 8px 10px; text-align: left; }
td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
tr:nth-child(even) { background: #f7fafc; }
.footer { margin-top: 16px; font-size: 11px; color: #888; }
</style></head>
<body>
<h1>{$title}</h1>
<div class="summary">
<strong>Date:</strong> {$date} &nbsp;|&nbsp; <strong>Venue:</strong> {$venue}<br>
<strong>Expected:</strong> {$report['expected_participants']} &nbsp;|&nbsp;
<strong>Present:</strong> {$report['present']} &nbsp;|&nbsp;
<strong>Late:</strong> {$report['late']} &nbsp;|&nbsp;
<strong>Absent:</strong> {$report['absent']} &nbsp;|&nbsp;
<strong>Pending:</strong> {$report['pending']} &nbsp;|&nbsp;
<strong>Rate:</strong> {$report['attendance_rate']}%
</div>
<table>
<thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Department</th><th>Faculty</th><th>Status</th><th>Check-in</th><th>Check-out</th></tr></thead>
<tbody>{$rowsHtml}</tbody>
</table>
<div class="footer">Generated on {$event->start_date->format('Y-m-d H:i:s')}</div>
</body>
</html>
HTML;
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
