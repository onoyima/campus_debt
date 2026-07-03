<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceVenueTerminalLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueTerminalLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceVenueTerminalLog::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('terminal_id')) {
            $query->where('terminal_id', $request->terminal_id);
        }

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);
        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceVenueTerminalLog::with($this->parseIncludes($request, []))->find($id);
        if (!$record) return response()->json(['message' => 'Venue terminal log not found.'], 404);
        return response()->json(['data' => $record]);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
