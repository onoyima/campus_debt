<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceTerminal;
use App\Services\TerminalClockingService;
use App\Services\ZktService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ZKTController extends Controller
{
    protected ZktService $zktService;

    public function __construct(ZktService $zktService)
    {
        $this->zktService = $zktService;
    }

    /**
     * Get terminal configuration for sync (machines poll this endpoint)
     */
    public function config(Request $request, $id): JsonResponse
    {
        $terminal = AttendanceTerminal::with('venue')->find($id);
        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found'], 404);
        }

        $config = app(TerminalClockingService::class)->getConfig($terminal);

        return response()->json(['data' => $config]);
    }

    /**
     * Register/pair a ZKT terminal with the server
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'device_id' => 'required|string|max:255',
            'serial_number' => 'required|string|max:100',
            'device_model' => 'required|string|max:100',
            'firmware' => 'nullable|string|max:100',
            'ip_address' => 'required|string|max:45',
            'port' => 'required|integer|min:1|max:65535',
            'user_count' => 'nullable|integer',
            'fingerprint_count' => 'nullable|integer',
            'face_count' => 'nullable|integer',
            'transaction_count' => 'nullable|integer',
            'clocking_mode' => 'nullable|string|in:any,class_only,staff_only,event_only',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $terminal = AttendanceTerminal::where('device_id', $data['device_id'])->first();

        $updateData = [
            'ip_address' => $data['ip_address'],
            'port' => $data['port'],
            'serial_number' => $data['serial_number'],
            'device_model' => $data['device_model'],
            'firmware' => $data['firmware'] ?? null,
            'user_count' => $data['user_count'] ?? 0,
            'fingerprint_count' => $data['fingerprint_count'] ?? 0,
            'face_count' => $data['face_count'] ?? 0,
            'transaction_count' => $data['transaction_count'] ?? 0,
            'connection_status' => 'online',
            'last_heartbeat_at' => now(),
            'is_active' => true,
        ];

        if ($terminal) {
            $terminal->update($updateData);
            $this->zktService->logActivity($terminal, 're-registered', 'info', 'Terminal re-registered');
            return response()->json(['message' => 'Terminal updated successfully', 'data' => $terminal]);
        }

        $terminal = AttendanceTerminal::where('serial_number', $data['serial_number'])->first();
        if ($terminal) {
            $terminal->update(array_merge($updateData, ['device_id' => $data['device_id']]));
            $this->zktService->logActivity($terminal, 're-registered', 'info', 'Terminal re-registered by serial');
            return response()->json(['message' => 'Terminal updated successfully', 'data' => $terminal]);
        }

        $data['api_key'] = bin2hex(random_bytes(32));
        $terminal = AttendanceTerminal::create(array_merge($updateData, [
            'device_id' => $data['device_id'],
            'terminal_type' => 'zk_biometric',
            'os' => 'zk_linux',
            'clocking_mode' => $data['clocking_mode'] ?? 'any',
        ]));
        $terminal->refresh();

        $this->zktService->logActivity($terminal, 'registered', 'info', 'New terminal registered');

        return response()->json([
            'message' => 'Terminal registered successfully',
            'data' => $terminal,
            'api_key' => $data['api_key'],
        ], 201);
    }

    /**
     * Receive pushed attendance events from ZKT terminal
     */
    public function pushAttendance(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'terminal_id' => 'required|integer|exists:attendance_terminals,id',
            'records' => 'required|array',
            'records.*.user_id' => 'required|string',
            'records.*.timestamp' => 'required|date',
            'records.*.method' => 'nullable|string|in:fingerprint,face,pin,card,password',
            'records.*.status' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $result = $this->zktService->processPushAttendance($validator->validated());

        return response()->json($result);
    }

    /**
     * Heartbeat/ping from ZKT terminal
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'terminal_id' => 'required|integer|exists:attendance_terminals,id',
            'user_count' => 'nullable|integer',
            'fingerprint_count' => 'nullable|integer',
            'face_count' => 'nullable|integer',
            'transaction_count' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $terminal = AttendanceTerminal::find($validator->validated()['terminal_id']);
        $updateData = [
            'connection_status' => 'online',
            'last_heartbeat_at' => now(),
        ];

        foreach (['user_count', 'fingerprint_count', 'face_count', 'transaction_count'] as $field) {
            if ($request->filled($field)) {
                $updateData[$field] = $request->integer($field);
            }
        }

        $terminal->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received',
            'server_time' => now()->toIso8601String(),
            'next_poll' => now()->addSeconds(30)->toIso8601String(),
        ]);
    }

    /**
     * Admin: Pull attendance records from a terminal
     */
    public function pullAttendance(Request $request, $id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);
        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found'], 404);
        }

        if (!$terminal->ip_address) {
            return response()->json(['message' => 'Terminal has no IP address configured'], 400);
        }

        $records = $this->zktService->pullAttendance($terminal);
        $this->zktService->logActivity($terminal, 'attendance_pulled', 'info', "Pulled " . count($records) . " records manually");

        return response()->json([
            'message' => 'Attendance pulled successfully',
            'count' => count($records),
            'data' => $records,
        ]);
    }

    /**
     * Admin: Sync users to a terminal
     */
    public function syncUsers(Request $request, $id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);
        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found'], 404);
        }

        $userIds = $request->array('user_ids', []);
        $synced = $this->zktService->syncUsers($terminal, $userIds);
        $this->zktService->logActivity($terminal, 'users_synced', 'info', "Synced {$synced} users");

        return response()->json([
            'message' => 'Users synced successfully',
            'count' => $synced,
        ]);
    }

    /**
     * Admin: Get terminal device info
     */
    public function deviceInfo($id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);
        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found'], 404);
        }

        $info = $this->zktService->getDeviceInfo($terminal);
        if (!$info) {
            return response()->json(['message' => 'Failed to get device info. Check connection.'], 502);
        }

        return response()->json(['data' => $info]);
    }

    /**
     * Admin: Restart terminal
     */
    public function restart(Request $request, $id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);
        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found'], 404);
        }

        $success = $this->zktService->restart($terminal);
        $this->zktService->logActivity($terminal, 'restarted', 'warning', 'Terminal restarted by admin');

        return response()->json([
            'message' => $success ? 'Restart command sent' : 'Failed to send restart command',
        ]);
    }
}
