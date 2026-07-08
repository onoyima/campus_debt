<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceTerminal;
use App\Models\Attendance\AttendanceVenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class LiveFeedController extends Controller
{
    private function nodeBaseUrl(): string
    {
        return config('app.node_service_url', env('NODE_SERVICE_URL', 'http://localhost:4000'));
    }

    private function nodeApiKey(): string
    {
        return config('app.node_service_api_key', env('NODE_SERVICE_API_KEY', ''));
    }

    public function index(): JsonResponse
    {
        $terminals = AttendanceTerminal::with('venue')->get();
        $today = now()->format('Y-m-d');

        $nodeDevices = [];
        try {
            $response = Http::timeout(5)
                ->withHeaders($this->nodeApiKey() ? ['X-API-Key' => $this->nodeApiKey()] : [])
                ->get($this->nodeBaseUrl() . '/device-api/devices/status');
            if ($response->successful()) {
                $nodeDevices = $response->json('data', []);
            }
        } catch (\Exception $e) {
            // Node unreachable — will still show DB terminals
        }

        $nodeDeviceMap = collect($nodeDevices)->keyBy('id');

        $devices = $terminals->map(function ($t) use ($nodeDeviceMap, $today) {
            $nd = $nodeDeviceMap->get($t->id, []);
            $scansToday = AttendanceEventAttendance::where('verified_by_terminal_id', $t->id)
                ->whereDate('timestamp', $today)
                ->count();

            return [
                'id' => $t->id,
                'device_id' => $t->device_id,
                'ip_address' => $t->ip_address,
                'port' => $t->port,
                'name' => $t->name ?? $t->device_id,
                'serial_number' => $t->serial_number,
                'device_model' => $t->device_model,
                'clocking_mode' => $t->clocking_mode,
                'venue_id' => $t->venue_id,
                'venue_name' => $t->venue?->name,
                'connection_status' => $nd['connection_status'] ?? $t->connection_status ?? 'unknown',
                'connected' => $nd['connected'] ?? ($t->connection_status === 'online'),
                'last_activity' => $nd['last_activity'] ?? $t->last_heartbeat_at,
                'scans_today' => $scansToday,
                'is_active' => $t->is_active,
            ];
        });

        $stats = [
            'total_devices' => $terminals->count(),
            'online' => $devices->where('connected', true)->count(),
            'offline' => $devices->where('connected', false)->where('is_active', true)->count(),
            'inactive' => $devices->where('is_active', false)->count(),
            'scans_today' => $devices->sum('scans_today'),
            'node_connected' => count($nodeDevices) > 0,
        ];

        return response()->json(['data' => ['devices' => $devices, 'stats' => $stats]]);
    }

    public function scans(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 50);

        $query = AttendanceEventAttendance::with([
            'institutionalEvent' => function ($q) { $q->select('id', 'title'); },
            'verifiedByTerminal' => function ($q) { $q->select('id', 'device_id', 'ip_address'); },
            'status' => function ($q) { $q->select('id', 'code', 'display_name'); },
        ]);

        if ($request->filled('terminal_id')) {
            $query->where('verified_by_terminal_id', $request->terminal_id);
        }

        if ($request->filled('event_id')) {
            $query->where('institutional_event_id', $request->event_id);
        }

        if ($request->filled('from')) {
            $query->where('timestamp', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('timestamp', '<=', $request->to);
        }

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }

        $scans = $query->orderBy('timestamp', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $scans->items(),
            'meta' => [
                'current_page' => $scans->currentPage(),
                'last_page' => $scans->lastPage(),
                'per_page' => $scans->perPage(),
                'total' => $scans->total(),
            ],
        ]);
    }

    public function eventTerminalActivity(Request $request, $eventId): JsonResponse
    {
        $event = AttendanceInstitutionalEvent::with('venue')->findOrFail($eventId);
        $terminals = AttendanceTerminal::where('venue_id', $event->venue_id)
            ->where('is_active', true)
            ->get();

        $nodeDeviceMap = collect([]);
        try {
            $response = Http::timeout(5)
                ->withHeaders($this->nodeApiKey() ? ['X-API-Key' => $this->nodeApiKey()] : [])
                ->get($this->nodeBaseUrl() . '/device-api/devices/status');
            if ($response->successful()) {
                $nodeDeviceMap = collect($response->json('data', []))->keyBy('id');
            }
        } catch (\Exception $e) {
            // Node unreachable
        }

        $deviceActivity = $terminals->map(function ($t) use ($event, $nodeDeviceMap) {
            $nd = $nodeDeviceMap->get($t->id, []);
            $scans = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('verified_by_terminal_id', $t->id)
                ->orderBy('timestamp', 'desc')
                ->limit(10)
                ->get(['id', 'participant_id', 'participant_type', 'status_id', 'clock_type', 'timestamp', 'attendance_method']);

            return [
                'terminal_id' => $t->id,
                'device_id' => $t->device_id,
                'ip_address' => $t->ip_address,
                'name' => $t->name ?? $t->device_id,
                'connection_status' => $nd['connection_status'] ?? $t->connection_status ?? 'unknown',
                'connected' => $nd['connected'] ?? ($t->connection_status === 'online'),
                'last_activity' => $nd['last_activity'] ?? $t->last_heartbeat_at,
                'total_scans' => AttendanceEventAttendance::where('institutional_event_id', $event->id)
                    ->where('verified_by_terminal_id', $t->id)
                    ->count(),
                'recent_scans' => $scans,
            ];
        });

        return response()->json([
            'data' => [
                'event' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'venue_name' => $event->venue?->name,
                    'start_date' => $event->start_date,
                    'end_date' => $event->end_date,
                ],
                'terminals' => $deviceActivity,
                'stats' => [
                    'total_terminals' => $terminals->count(),
                    'online' => $deviceActivity->where('connected', true)->count(),
                    'offline' => $deviceActivity->where('connected', false)->count(),
                    'total_scans' => $deviceActivity->sum('total_scans'),
                ],
            ],
        ]);
    }
}
