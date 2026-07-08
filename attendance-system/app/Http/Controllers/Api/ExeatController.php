<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExeatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = DB::connection('mysql_remote')->table('exeat_requests');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('student_id', 'like', "%{$search}%")
                  ->orWhere('reason', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%")
                  ->orWhere('status', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show($id): JsonResponse
    {
        $record = DB::connection('mysql_remote')->table('exeat_requests')->where('id', $id)->first();

        if (!$record) {
            return response()->json(['message' => 'Exeat request not found.'], 404);
        }

        $approvals = DB::connection('mysql_remote')->table('exeat_approvals')
            ->where('exeat_request_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $record->approvals = $approvals;

        return response()->json(['data' => $record]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $studentId = $user->id;

        // Check for outstanding debts
        $outstandingDebt = \App\Models\Attendance\AttendanceDebt::where('student_id', $studentId)
            ->whereIn('payment_status', ['unpaid', 'overdue'])
            ->exists();

        if ($outstandingDebt) {
            return response()->json([
                'message' => 'Cannot submit exeat request. You have outstanding attendance debts that must be cleared first.',
                'blocked' => true,
                'reason' => 'outstanding_debts',
            ], 403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'student_id' => 'required|integer',
            'departure_date' => 'required|date',
            'return_date' => 'required|date|after_or_equal:departure_date',
            'reason' => 'required|string|max:500',
            'destination' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $id = \Illuminate\Support\Facades\DB::connection('mysql_remote')->table('exeat_requests')->insertGetId([
                'student_id' => $request->student_id,
                'departure_date' => $request->departure_date,
                'return_date' => $request->return_date,
                'reason' => $request->reason,
                'destination' => $request->destination,
                'emergency_contact' => $request->emergency_contact,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $record = \Illuminate\Support\Facades\DB::connection('mysql_remote')->table('exeat_requests')->where('id', $id)->first();

            return response()->json(['data' => $record, 'message' => 'Exeat request submitted successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to submit exeat request.', 'error' => $e->getMessage()], 500);
        }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) return [];
        return array_intersect(explode(',', $request->include), $allowed);
    }
}
