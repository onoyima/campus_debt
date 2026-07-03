<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceStatusType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatusTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 50);

        $statuses = AttendanceStatusType::orderBy('sort_order')
            ->orderBy('display_name')
            ->paginate($perPage);

        return response()->json([
            'data' => $statuses->items(),
            'meta' => [
                'current_page' => $statuses->currentPage(),
                'last_page' => $statuses->lastPage(),
                'per_page' => $statuses->perPage(),
                'total' => $statuses->total(),
            ],
        ]);
    }
}
