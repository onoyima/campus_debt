<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Services\AutoAbsentMarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceSession::query();

        $includes = $this->parseIncludes($request, ['venue', 'records', 'institutionalEvent']);
        $query->with($includes);

        if ($request->filled('from')) {
            $query->whereDate('session_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('session_date', '<=', $request->to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->venue_id);
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('session_type')) {
            $query->where('session_type', $request->session_type);
        }

        $query->withCount('records');

        $sessions = $query->paginate($perPage);

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $sessions->getCollection()->transform(function ($session) use ($studentId) {
                $totalRecords = $session->records_count;
                $attendedRecords = AttendanceRecord::where('session_id', $session->id)
                    ->where('student_id', $studentId)
                    ->whereHas('status', function ($q) {
                        $q->where('counts_as_present', true);
                    })
                    ->count();
                $session->attendance_percentage = $totalRecords > 0
                    ? round(($attendedRecords / $totalRecords) * 100, 2)
                    : 0;

                return $session;
            });
        }

        return response()->json([
            'data' => $sessions->items(),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'staff_id' => 'required|integer',
            'session_type' => 'required|string|max:50',
            'session_date' => 'required|date',
            'opens_at' => 'required|date_format:Y-m-d H:i:s',
            'closes_at' => 'required|date_format:Y-m-d H:i:s|after:opens_at',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'title' => 'nullable|string|max:255',
            'course_assigned_id' => 'nullable|integer',
            'max_participants' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $session = AttendanceSession::create($data);
            $session->load('venue');
            $session->loadCount('records');

            if (($data['status'] ?? null) === 'active' && ! empty($data['course_assigned_id'])) {
                app(AutoAbsentMarkService::class)->markAbsentForSession($session);
            }

            return response()->json(['data' => $session, 'message' => 'Session created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['venue', 'records', 'institutionalEvent']);
        $session = AttendanceSession::with($includes)->withCount('records')->find($id);

        if (! $session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $studentId = $request->integer('student_id');
        if ($studentId) {
            $totalRecords = $session->records_count;
            $attendedRecords = AttendanceRecord::where('session_id', $session->id)
                ->where('student_id', $studentId)
                ->whereHas('status', function ($q) {
                    $q->where('counts_as_present', true);
                })
                ->count();
            $session->attendance_percentage = $totalRecords > 0
                ? round(($attendedRecords / $totalRecords) * 100, 2)
                : 0;
        }

        return response()->json(['data' => $session]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $session = AttendanceSession::find($id);

        if (! $session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'staff_id' => 'sometimes|required|integer',
            'session_type' => 'sometimes|required|string|max:50',
            'session_date' => 'sometimes|required|date',
            'opens_at' => 'sometimes|required|date_format:Y-m-d H:i:s',
            'closes_at' => 'sometimes|required|date_format:Y-m-d H:i:s|after:opens_at',
            'venue_id' => 'nullable|integer|exists:attendance_venues,id',
            'title' => 'nullable|string|max:255',
            'course_assigned_id' => 'nullable|integer',
            'max_participants' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $wasActive = $session->status === 'active';
            $session->update($data);
            $session->load('venue');
            $session->loadCount('records');

            $becameActive = ($data['status'] ?? null) === 'active' || (! $wasActive && $session->status === 'active');
            if ($becameActive && $session->course_assigned_id) {
                app(AutoAbsentMarkService::class)->markAbsentForSession($session);
            }

            return response()->json(['data' => $session, 'message' => 'Session updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $session = AttendanceSession::find($id);

        if (! $session) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        try {
            $session->delete();

            return response()->json(['message' => 'Session deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete session.', 'error' => $e->getMessage()], 500);
        }
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="session_upload_template.csv"',
        ];

        $columns = ['staff_id', 'session_type', 'session_date', 'opens_at', 'closes_at', 'venue_id', 'title', 'course_assigned_id', 'max_participants', 'status'];
        $callback = function () use ($columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            fputcsv($handle, ['101', 'lecture', '2026-07-10', '2026-07-10 09:00:00', '2026-07-10 11:00:00', '1', 'CSC 101 - Introduction', '42', '100', 'active']);
            fputcsv($handle, ['102', 'practical', '2026-07-11', '2026-07-11 14:00:00', '2026-07-11 17:00:00', '2', 'PHY 102 Lab', '', '50', 'scheduled']);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function bulkUpload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            $rows = [];

            if (in_array($extension, ['csv', 'txt'])) {
                $handle = fopen($file->getRealPath(), 'r');
                $header = fgetcsv($handle);
                while (($row = fgetcsv($handle)) !== false) {
                    $rows[] = array_combine($header, $row);
                }
                fclose($handle);
            } else {
                $spreadsheet = IOFactory::load($file->getRealPath());
                $worksheet = $spreadsheet->getActiveSheet();
                $data = $worksheet->toArray();
                $header = array_shift($data);
                foreach ($data as $row) {
                    if (array_filter($row)) {
                        $rows[] = array_combine($header, $row);
                    }
                }
            }

            if (empty($rows)) {
                return response()->json(['message' => 'File is empty.'], 422);
            }

            $created = 0;
            $failed = [];
            $autoAbsent = app(AutoAbsentMarkService::class);

            foreach ($rows as $i => $row) {
                $staffId = trim($row['staff_id'] ?? '');
                $sessionType = trim($row['session_type'] ?? '');
                $sessionDate = trim($row['session_date'] ?? '');
                $opensAt = trim($row['opens_at'] ?? '');
                $closesAt = trim($row['closes_at'] ?? '');

                if (! $staffId || ! is_numeric($staffId)) {
                    $failed[] = 'Row '.($i + 2).': invalid or missing staff_id';

                    continue;
                }
                if (! $sessionType) {
                    $failed[] = 'Row '.($i + 2)." (staff {$staffId}): missing session_type";

                    continue;
                }
                if (! $sessionDate) {
                    $failed[] = 'Row '.($i + 2)." (staff {$staffId}): missing session_date";

                    continue;
                }
                if (! $opensAt) {
                    $failed[] = 'Row '.($i + 2)." (staff {$staffId}): missing opens_at";

                    continue;
                }
                if (! $closesAt) {
                    $failed[] = 'Row '.($i + 2)." (staff {$staffId}): missing closes_at";

                    continue;
                }

                try {
                    $venueId = trim($row['venue_id'] ?? '');
                    $data = [
                        'staff_id' => (int) $staffId,
                        'session_type' => $sessionType,
                        'session_date' => $sessionDate,
                        'opens_at' => $opensAt,
                        'closes_at' => $closesAt,
                        'venue_id' => $venueId !== '' ? (int) $venueId : null,
                        'title' => trim($row['title'] ?? ''),
                        'course_assigned_id' => isset($row['course_assigned_id']) && $row['course_assigned_id'] !== '' ? (int) $row['course_assigned_id'] : null,
                        'max_participants' => isset($row['max_participants']) && $row['max_participants'] !== '' ? (int) $row['max_participants'] : null,
                        'status' => trim($row['status'] ?? 'scheduled'),
                    ];

                    $session = AttendanceSession::create($data);

                    if ($session->status === 'active' && $session->course_assigned_id) {
                        $autoAbsent->markAbsentForSession($session);
                    }

                    $created++;
                } catch (\Exception $e) {
                    $failed[] = 'Row '.($i + 2)." (staff {$staffId}): ".$e->getMessage();
                }
            }

            return response()->json([
                'message' => "{$created} session(s) created. ".count($failed).' row(s) failed.',
                'created' => $created,
                'failed' => $failed,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to process file.', 'error' => $e->getMessage()], 500);
        }
    }

    public function restore(int $id): JsonResponse
    {
        $model = AttendanceSession::withTrashed()->findOrFail($id);
        $model->restore();

        return response()->json(['message' => 'Restored successfully.']);
    }

    public function forceDelete(int $id): JsonResponse
    {
        $model = AttendanceSession::withTrashed()->findOrFail($id);
        $model->forceDelete();

        return response()->json(['message' => 'Permanently deleted.']);
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (! $request->filled('include')) {
            return [];
        }

        $includes = explode(',', $request->include);

        return array_intersect($includes, $allowed);
    }
}
