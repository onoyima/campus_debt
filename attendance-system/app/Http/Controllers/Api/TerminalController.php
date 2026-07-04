<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TerminalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceTerminal::query();

        $includes = $this->parseIncludes($request, ['venue']);
        $query->with($includes);

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('terminal_type')) {
            $query->where('terminal_type', $request->terminal_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('device_id', 'like', "%{$search}%")
                  ->orWhere('terminal_type', 'like', "%{$search}%")
                  ->orWhere('os', 'like', "%{$search}%")
                  ->orWhere('firmware_version', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%")
                  ->orWhere('device_model', 'like', "%{$search}%");
            });
        }

        $terminals = $query->paginate($perPage);

        return response()->json([
            'data' => $terminals->items(),
            'meta' => [
                'current_page' => $terminals->currentPage(),
                'last_page' => $terminals->lastPage(),
                'per_page' => $terminals->perPage(),
                'total' => $terminals->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'venue_id' => 'required|integer|exists:attendance_venues,id',
            'device_id' => 'required|string|max:255|unique:attendance_terminals,device_id',
            'terminal_type' => 'required|string|max:50',
            'is_active' => 'boolean',
            'os' => 'nullable|string|max:100',
            'firmware_version' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'clocking_mode' => 'nullable|string|in:any,class_only,staff_only,event_only',
            'allow_any_venue' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $terminal = AttendanceTerminal::create($validator->validated());
            $terminal->load('venue');

            return response()->json(['data' => $terminal, 'message' => 'Terminal created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create terminal.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['venue']);
        $terminal = AttendanceTerminal::with($includes)->find($id);

        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        return response()->json(['data' => $terminal]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);

        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'venue_id' => 'sometimes|required|integer|exists:attendance_venues,id',
            'device_id' => 'sometimes|required|string|max:255|unique:attendance_terminals,device_id,' . $id,
            'terminal_type' => 'sometimes|required|string|max:50',
            'is_active' => 'boolean',
            'os' => 'nullable|string|max:100',
            'firmware_version' => 'nullable|string|max:50',
            'clocking_mode' => 'nullable|string|in:any,class_only,staff_only,event_only',
            'allow_any_venue' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $terminal->update($validator->validated());
            $terminal->load('venue');

            return response()->json(['data' => $terminal, 'message' => 'Terminal updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update terminal.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $terminal = AttendanceTerminal::find($id);

        if (!$terminal) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        try {
            $terminal->delete();

            return response()->json(['message' => 'Terminal deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete terminal.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceTerminal::withTrashed()->findOrFail($id);
        $model->restore();
        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceTerminal::withTrashed()->findOrFail($id);
        $model->forceDelete();
        return response()->json(['message' => 'Permanently deleted.']);
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
