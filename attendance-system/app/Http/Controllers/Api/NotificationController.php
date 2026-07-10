<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceNotification::query();
        $query->with($this->parseIncludes($request, []));

        if ($request->filled('recipient_type')) {
            $query->where('recipient_type', $request->recipient_type);
        }

        if ($request->filled('recipient_id')) {
            $query->where('recipient_id', $request->recipient_id);
        }

        if ($request->filled('notification_type')) {
            $query->where('notification_type', $request->notification_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => ['current_page' => $records->currentPage(), 'last_page' => $records->lastPage(), 'per_page' => $records->perPage(), 'total' => $records->total()],
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $record = AttendanceNotification::with($this->parseIncludes($request, []))->find($id);
        if (! $record) {
            return response()->json(['message' => 'Notification not found.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function markAsRead(Request $request, $id): JsonResponse
    {
        $record = AttendanceNotification::find($id);
        if (! $record) {
            return response()->json(['message' => 'Notification not found.'], 404);
        }
        try {
            $record->update(['read_at' => now()]);

            return response()->json(['data' => $record, 'message' => 'Notification marked as read.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to mark notification as read.', 'error' => $e->getMessage()], 500);
        }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        return array_intersect(explode(',', $request->include), $allowed);
    }
}
