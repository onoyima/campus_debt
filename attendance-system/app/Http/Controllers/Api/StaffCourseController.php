<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceVenue;
use App\Services\GhostAdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffCourseController extends Controller
{
    public function myCourses(Request $request): JsonResponse
    {
        $staffId = $request->user()->id;

        $assignments = DB::connection('mysql_remote')
            ->table('course_assigneds')
            ->join('courses', 'course_assigneds.course_id', '=', 'courses.id')
            ->where('course_assigneds.staff_id', $staffId)
            ->where('course_assigneds.status', 2)
            ->select(
                'course_assigneds.id as course_assigned_id',
                'course_assigneds.academic_session_id',
                'course_assigneds.vu_semester_id',
                'courses.code as course_code',
                'courses.title as course_title',
                'courses.credit_load'
            )
            ->get();

        $data = $assignments->map(function ($ca) {
            $sessionIds = AttendanceSession::where('course_assigned_id', $ca->course_assigned_id)
                ->pluck('id');

            $totalSessions = $sessionIds->count();
            $totalRecords = AttendanceRecord::whereIn('session_id', $sessionIds)->count();
            $presentStatusIds = AttendanceStatusType::where('counts_as_present', true)->pluck('id');
            $presentCount = AttendanceRecord::whereIn('session_id', $sessionIds)
                ->whereIn('status_id', $presentStatusIds)
                ->count();

            return [
                'course_assigned_id' => $ca->course_assigned_id,
                'course_code' => $ca->course_code,
                'course_title' => $ca->course_title,
                'credit_load' => $ca->credit_load,
                'academic_session_id' => $ca->academic_session_id,
                'vu_semester_id' => $ca->vu_semester_id,
                'total_sessions' => $totalSessions,
                'total_attendance_records' => $totalRecords,
                'present_count' => $presentCount,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function courseAttendance(Request $request, int $courseAssignedId): JsonResponse
    {
        $staffId = $request->user()->id;
        $this->authorizeCourseAccess($staffId, $courseAssignedId);

        $sessionIds = AttendanceSession::where('course_assigned_id', $courseAssignedId)
            ->pluck('id');

        $perPage = $request->integer('per_page', 20);
        $records = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->with(['session.venue', 'status'])
            ->orderBy('timestamp', 'desc')
            ->paginate($perPage);

        // Enrich with student names from remote
        $studentIds = collect($records->items())->pluck('student_id')->unique()->filter()->values();
        $studentMap = [];
        if ($studentIds->isNotEmpty()) {
            $students = DB::connection('mysql_remote')
                ->table('students')
                ->whereIn('id', $studentIds)
                ->select('id', 'fname', 'mname', 'lname')
                ->get();
            foreach ($students as $s) {
                $studentMap[$s->id] = trim("{$s->fname} {$s->mname} {$s->lname}");
            }
        }

        $data = collect($records->items())->map(function ($r) use ($studentMap) {
            return [
                'id' => $r->id,
                'student_id' => $r->student_id,
                'student_name' => $studentMap[$r->student_id] ?? "Student #{$r->student_id}",
                'session_id' => $r->session_id,
                'session_title' => $r->session?->title,
                'session_date' => $r->session?->session_date,
                'venue_name' => $r->session?->venue?->name,
                'status_code' => $r->status?->code,
                'status_label' => $r->status?->label,
                'attendance_method' => $r->attendance_method,
                'timestamp' => $r->timestamp,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function courseSessions(Request $request, int $courseAssignedId): JsonResponse
    {
        $staffId = $request->user()->id;
        $this->authorizeCourseAccess($staffId, $courseAssignedId);

        $sessions = AttendanceSession::where('course_assigned_id', $courseAssignedId)
            ->with('venue')
            ->orderBy('session_date', 'desc')
            ->orderBy('opens_at', 'desc')
            ->get()
            ->map(function ($s) {
                $presentStatusIds = AttendanceStatusType::where('counts_as_present', true)->pluck('id');
                $totalRecords = AttendanceRecord::where('session_id', $s->id)->count();
                $presentRecords = AttendanceRecord::where('session_id', $s->id)
                    ->whereIn('status_id', $presentStatusIds)
                    ->count();

                return [
                    'id' => $s->id,
                    'title' => $s->title,
                    'session_date' => $s->session_date,
                    'opens_at' => $s->opens_at,
                    'closes_at' => $s->closes_at,
                    'status' => $s->status,
                    'venue_id' => $s->venue_id,
                    'venue_name' => $s->venue?->name,
                    'total_attendance' => $totalRecords,
                    'present_count' => $presentRecords,
                ];
            });

        return response()->json(['data' => $sessions]);
    }

    public function updateSession(Request $request, int $courseAssignedId, int $sessionId): JsonResponse
    {
        $staffId = $request->user()->id;
        $this->authorizeCourseAccess($staffId, $courseAssignedId);

        $session = AttendanceSession::where('id', $sessionId)
            ->where('course_assigned_id', $courseAssignedId)
            ->firstOrFail();

        $validated = $request->validate([
            'session_date' => 'sometimes|date',
            'opens_at' => 'sometimes|date',
            'closes_at' => 'sometimes|date|after:opens_at',
            'venue_id' => 'sometimes|exists:attendance_venues,id',
            'title' => 'sometimes|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $session->update($validated);

        return response()->json([
            'message' => 'Session updated successfully.',
            'data' => $session->fresh()->load('venue'),
        ]);
    }

    public function courseReport(Request $request, int $courseAssignedId)
    {
        $staffId = $request->user()->id;
        $this->authorizeCourseAccess($staffId, $courseAssignedId);

        $ca = DB::connection('mysql_remote')
            ->table('course_assigneds')
            ->join('courses', 'course_assigneds.course_id', '=', 'courses.id')
            ->where('course_assigneds.id', $courseAssignedId)
            ->select('courses.code', 'courses.title')
            ->first();

        $sessionIds = AttendanceSession::where('course_assigned_id', $courseAssignedId)
            ->pluck('id');

        $records = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->with(['session', 'status'])
            ->orderBy('student_id')
            ->orderBy('timestamp')
            ->get();

        $studentIds = $records->pluck('student_id')->unique()->filter()->values();
        $studentMap = [];
        if ($studentIds->isNotEmpty()) {
            $students = DB::connection('mysql_remote')
                ->table('students')
                ->whereIn('id', $studentIds)
                ->select('id', 'fname', 'mname', 'lname', 'email')
                ->get();
            foreach ($students as $s) {
                $studentMap[$s->id] = $s;
            }
        }

        $filename = $ca
            ? preg_replace('/[^a-zA-Z0-9_-]/', '_', "{$ca->code}_{$ca->title}")
            : "course_{$courseAssignedId}";
        $filename = "attendance_report_{$filename}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($records, $studentMap) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // BOM for UTF-8

            fputcsv($handle, [
                'Student ID', 'Student Name', 'Email',
                'Session ID', 'Session Title', 'Session Date',
                'Status', 'Attendance Method', 'Timestamp', 'Venue',
            ]);

            foreach ($records as $r) {
                $student = $studentMap[$r->student_id] ?? null;
                fputcsv($handle, [
                    $r->student_id,
                    $student ? trim("{$student->fname} {$student->mname} {$student->lname}") : "Student #{$r->student_id}",
                    $student->email ?? '',
                    $r->session_id,
                    $r->session?->title,
                    $r->session?->session_date,
                    $r->status?->code ?? $r->status?->label,
                    $r->attendance_method,
                    $r->timestamp,
                    $r->session?->venue?->name,
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function authorizeCourseAccess(int $staffId, int $courseAssignedId): void
    {
        // Ghost admins bypass course assignment checks
        if (GhostAdminService::isGhostAdmin($staffId)) {
            return;
        }

        $assigned = DB::connection('mysql_remote')
            ->table('course_assigneds')
            ->where('id', $courseAssignedId)
            ->where('staff_id', $staffId)
            ->where('status', 2)
            ->exists();

        if (!$assigned) {
            abort(403, 'You are not assigned to this course.');
        }
    }
}
