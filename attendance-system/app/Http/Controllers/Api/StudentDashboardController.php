<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceDebt;
use App\Models\Attendance\AttendanceExamEligibility;
use App\Models\Attendance\AttendanceRecord;
use App\Models\Attendance\AttendanceStatusType;
use App\Models\Attendance\AttendanceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Attendance\AttendanceEventParticipant;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Services\AttendanceEventService;

class StudentDashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $studentId = $request->integer('student_id');
        if (!$studentId) {
            return response()->json(['message' => 'student_id is required.'], 422);
        }

        $academicSessionId = $request->integer('academic_session_id');
        $vuSemesterId = $request->integer('vu_semester_id');

        $query = AttendanceExamEligibility::where('student_id', $studentId)
            ->with('eligibilityStatus');

        if ($academicSessionId) {
            $query->where('academic_session_id', $academicSessionId);
        }
        if ($vuSemesterId) {
            $query->where('vu_semester_id', $vuSemesterId);
        }

        $eligibilities = $query->get();

        // Fetch course names from remote
        $courseIds = $eligibilities->pluck('course_id')->unique()->filter()->values()->toArray();
        $courseMap = [];
        if (!empty($courseIds)) {
            $remoteCourses = DB::connection('mysql_remote')
                ->table('course_assigneds')
                ->join('courses', 'course_assigneds.course_id', '=', 'courses.id')
                ->whereIn('course_assigneds.id', $courseIds)
                ->select(
                    'course_assigneds.id as course_assigned_id',
                    'courses.code as course_code',
                    'courses.title as course_title',
                    'courses.credit_load',
                    'course_assigneds.academic_session_id',
                    'course_assigneds.vu_semester_id'
                )
                ->get();

            foreach ($remoteCourses as $rc) {
                $courseMap[$rc->course_assigned_id] = $rc;
            }
        }

        // Determine current session/semester from the first eligibility or use current
        $currentSessionId = $academicSessionId ?: $eligibilities->first()?->academic_session_id;
        $currentSemesterId = $vuSemesterId ?: $eligibilities->first()?->vu_semester_id;

        // Build courses array
        $courses = $eligibilities->map(function ($e) use ($courseMap) {
            $rc = $courseMap[$e->course_id] ?? null;
            return [
                'course_assigned_id' => $e->course_id,
                'course_code' => $rc->course_code ?? null,
                'course_title' => $rc->course_title ?? null,
                'academic_session_id' => $e->academic_session_id,
                'vu_semester_id' => $e->vu_semester_id,
                'attendance_percentage' => $e->attendance_percentage,
                'required_attendance_percentage' => $e->required_attendance_percentage,
                'total_classes' => $e->total_classes,
                'attended_classes' => $e->attended_classes,
                'is_eligible' => $e->eligibilityStatus?->is_eligible ?? false,
                'eligibility_status_code' => $e->eligibilityStatus?->code ?? 'unknown',
                'eligibility_status_label' => $e->eligibilityStatus?->label ?? 'Unknown',
                'school_fees_cleared' => $e->school_fees_cleared,
                'attendance_debts_cleared' => $e->attendance_debts_cleared,
                'course_registered' => $e->course_registered,
                'reasons' => $e->reasons_json,
            ];
        });

        $totalCourses = $courses->count();
        $overallPercentage = $totalCourses > 0
            ? round($courses->avg('attendance_percentage'), 1)
            : 0;

        // Live per-course attendance (includes active sessions, not just closed)
        $liveCourses = $this->buildLiveAttendance($studentId, $currentSessionId, $currentSemesterId, $courseMap);

        $outstandingDebts = AttendanceDebt::where('student_id', $studentId)
            ->where('payment_status', '!=', 'paid')
            ->sum('amount');

        $recentAttendance = AttendanceRecord::where('student_id', $studentId)
            ->with(['status', 'session.venue'])
            ->orderBy('timestamp', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'academic_session_id' => $currentSessionId,
                'vu_semester_id' => $currentSemesterId,
                'total_courses' => $totalCourses,
                'overall_attendance_percentage' => $overallPercentage,
                'outstanding_debts_total' => $outstandingDebts,
                'courses' => $courses,
                'live_courses' => $liveCourses,
                'eligibility_status' => $courses,
                'attendance_percentage' => $courses->map(fn($c) => [
                    'course_id' => $c['course_assigned_id'],
                    'percentage' => $c['attendance_percentage'],
                    'required' => $c['required_attendance_percentage'],
                ]),
                'recent_attendance' => $recentAttendance,
            ],
        ]);
    }

    private function buildLiveAttendance(int $studentId, $academicSessionId, $vuSemesterId, array $courseMap): array
    {
        $sessionQuery = AttendanceSession::whereNotNull('course_assigned_id');

        if ($academicSessionId || $vuSemesterId) {
            // We can't join directly, so fetch course_assigned_ids in the given session/semester
            if ($academicSessionId && $vuSemesterId) {
                $caIds = DB::connection('mysql_remote')
                    ->table('course_assigneds')
                    ->where('academic_session_id', $academicSessionId)
                    ->where('vu_semester_id', $vuSemesterId)
                    ->pluck('id')
                    ->toArray();
                if (!empty($caIds)) {
                    $sessionQuery->whereIn('course_assigned_id', $caIds);
                }
            }
        }

        $sessions = $sessionQuery->get();
        $presentStatusIds = AttendanceStatusType::where('counts_as_present', true)->pluck('id');
        $neutralStatusIds = AttendanceStatusType::where('counts_as_present', false)
            ->where('counts_as_absent', false)
            ->pluck('id');

        $grouped = $sessions->groupBy('course_assigned_id');
        $results = [];

        foreach ($grouped as $courseAssignedId => $sessionsGroup) {
            $sessionIds = $sessionsGroup->pluck('id');
            $totalClasses = count($sessionIds);
            $attendedClasses = AttendanceRecord::whereIn('session_id', $sessionIds)
                ->where('student_id', $studentId)
                ->whereIn('status_id', $presentStatusIds)
                ->count();
            $neutralClasses = AttendanceRecord::whereIn('session_id', $sessionIds)
                ->where('student_id', $studentId)
                ->whereIn('status_id', $neutralStatusIds)
                ->count();
            $adjustedTotal = max(0, $totalClasses - $neutralClasses);
            $percentage = $adjustedTotal > 0
                ? round(($attendedClasses / $adjustedTotal) * 100, 1)
                : 0;

            $rc = $courseMap[$courseAssignedId] ?? null;
            $results[] = [
                'course_assigned_id' => $courseAssignedId,
                'course_code' => $rc->course_code ?? null,
                'course_title' => $rc->course_title ?? null,
                'total_sessions' => $totalClasses,
                'attended' => $attendedClasses,
                'neutral' => $neutralClasses,
                'attendance_percentage' => $percentage,
            ];
        }

        return $results;
    }

    public function myDebts(Request $request): JsonResponse
    {
        $studentId = $request->user()->id;

        $debts = AttendanceDebt::where('student_id', $studentId)
            ->with(['penalty', 'attendanceRecord.session'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($d) {
                return [
                    'id' => $d->id,
                    'amount' => $d->amount,
                    'reason' => $d->reason,
                    'due_date' => $d->due_date,
                    'payment_status' => $d->payment_status,
                    'blocks_eligibility' => $d->blocks_eligibility,
                    'penalty_name' => $d->penalty?->name,
                    'session_title' => $d->attendanceRecord?->session?->title,
                    'session_date' => $d->attendanceRecord?->session?->session_date,
                    'created_at' => $d->created_at,
                ];
            });

        $totalOutstanding = $debts->where('payment_status', '!=', 'paid')->sum('amount');

        return response()->json([
            'data' => $debts,
            'total_outstanding' => $totalOutstanding,
        ]);
    }

    public function myAttendanceRecords(Request $request): JsonResponse
    {
        $studentId = $request->user()->id;

        $perPage = $request->integer('per_page', 20);
        $records = AttendanceRecord::where('student_id', $studentId)
            ->with(['session.venue', 'status'])
            ->orderBy('timestamp', 'desc')
            ->paginate($perPage);

        $data = collect($records->items())->map(function ($r) {
            return [
                'id' => $r->id,
                'session_id' => $r->session_id,
                'session_title' => $r->session?->title,
                'session_type' => $r->session?->session_type,
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

    public function myEvents(Request $request): JsonResponse
    {
        $studentId = $request->integer('student_id');
        if (!$studentId) {
            return response()->json(['message' => 'Student ID required.'], 400);
        }

        $participantEventIds = AttendanceEventParticipant::where('participant_type', 'student')
            ->where('participant_id', $studentId)
            ->pluck('institutional_event_id');

        $events = AttendanceInstitutionalEvent::with(['targetGroups', 'venue'])
            ->whereIn('id', $participantEventIds)
            ->orderBy('start_date', 'desc')
            ->get();

        $service = app(AttendanceEventService::class);
        $results = $events->map(function ($event) use ($service, $studentId) {
            $status = $service->getEventAttendanceStatus($event, 'student', $studentId);
            $windows = $service->getWindows($event);
            return [
                'id' => $event->id,
                'title' => $event->title,
                'start_date' => $event->start_date,
                'end_date' => $event->end_date,
                'venue_name' => $event->venue?->name,
                'is_mandatory' => $event->is_mandatory,
                'status' => $event->status,
                'attendance_status' => $status['status'],
                'check_in_time' => $status['check_in']?->timestamp,
                'check_out_time' => $status['check_out']?->timestamp,
                'windows' => [
                    'check_in_open' => $windows['check_in_open']->toDateTimeString(),
                    'check_in_close' => $windows['check_in_close']->toDateTimeString(),
                    'late_check_in_open' => $windows['late_check_in_open']->toDateTimeString(),
                    'late_check_in_close' => $windows['late_check_in_close']->toDateTimeString(),
                    'check_out_open' => $windows['check_out_open']->toDateTimeString(),
                    'check_out_close' => $windows['check_out_close']->toDateTimeString(),
                ],
            ];
        });

        return response()->json(['data' => $results]);
    }
}
