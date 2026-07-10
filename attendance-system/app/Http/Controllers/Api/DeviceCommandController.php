<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDeviceCommand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DeviceCommandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceDeviceCommand::query();

        if ($request->filled('terminal_id')) {
            $query->where('terminal_id', $request->terminal_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $commands = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $commands->items(),
            'meta' => [
                'current_page' => $commands->currentPage(),
                'last_page' => $commands->lastPage(),
                'per_page' => $commands->perPage(),
                'total' => $commands->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'terminal_id' => 'required|integer|exists:attendance_terminals,id',
            'command' => 'required|string|max:100|in:restart,sync_users,clear_logs,get_info,enable,disable,pull_attendance',
            'payload' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $cmd = AttendanceDeviceCommand::create($validator->validated());
            $cmd->load('terminal');

            return response()->json(['data' => $cmd, 'message' => 'Command queued successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create command.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id): JsonResponse
    {
        $cmd = AttendanceDeviceCommand::find($id);
        if (! $cmd) {
            return response()->json(['message' => 'Command not found.'], 404);
        }

        return response()->json(['data' => $cmd]);
    }

    /**
     * Terminal-facing: poll pending commands for a specific terminal
     * Auth'd by terminal.auth middleware — the terminal is identified by the API key
     */
    public function pending(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('authenticated_terminal');
        if (! $terminal) {
            return response()->json(['message' => 'Unauthenticated terminal.'], 401);
        }

        $commands = AttendanceDeviceCommand::pending()
            ->byTerminal($terminal->id)
            ->orderBy('created_at', 'asc')
            ->take(10)
            ->get();

        return response()->json(['data' => $commands]);
    }

    /**
     * Terminal-facing: report command result
     * Auth'd by terminal.auth middleware
     */
    public function update(Request $request, $id): JsonResponse
    {
        $terminal = $request->attributes->get('authenticated_terminal');
        $cmd = AttendanceDeviceCommand::find($id);

        if (! $cmd) {
            return response()->json(['message' => 'Command not found.'], 404);
        }

        if ($terminal && $cmd->terminal_id !== $terminal->id) {
            return response()->json(['message' => 'Command does not belong to this terminal.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:processing,completed,failed',
            'result' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if ($data['status'] === 'completed' || $data['status'] === 'failed') {
            $data['completed_at'] = now();
        }
        $cmd->update($data);

        return response()->json(['data' => $cmd, 'message' => 'Command updated.']);
    }
}
