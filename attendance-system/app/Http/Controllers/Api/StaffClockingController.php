<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStaffClocking;
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
            $query->whereDate('clocked_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('clocked_at', '<=', $request->to);
        }

        $records = $query->orderBy('clocked_at', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceStaffClocking::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Staff clocking record not found.'], 404);
        return response()->json(['data' => $record]);
    }

    public function myClockings(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = $request->integer('per_page', 15);
        $records = AttendanceStaffClocking::where('staff_id', $user->id)
            ->orderBy('clocked_at', 'desc')
            ->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function clockIn(Request $request): JsonResponse
    {
        $user = $request->user();
        $record = AttendanceStaffClocking::create([
            'staff_id' => $user->id,
            'clock_type' => 'in',
            'clocked_at' => now(),
        ]);
        return response()->json(['data' => $record, 'message' => 'Clocked in successfully.'], 201);
    }

    public function clockOut(Request $request): JsonResponse
    {
        $user = $request->user();
        $record = AttendanceStaffClocking::create([
            'staff_id' => $user->id,
            'clock_type' => 'out',
            'clocked_at' => now(),
        ]);
        return response()->json(['data' => $record, 'message' => 'Clocked out successfully.'], 201);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
