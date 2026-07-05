<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminStaffAssignmentController extends Controller
{
    public function courseAssignments(Request $request): JsonResponse
    {
        $academicSessionId = $request->integer('academic_session_id', 103);
        $vuSemesterId = $request->integer('vu_semester_id');
        $search = $request->string('search');
        $perPage = $request->integer('per_page', 20);

        // If no semester specified, use the first active one for this session
        if (!$vuSemesterId) {
            $vuSemesterId = Cache::remember('ca_default_semester', 3600, function () use ($academicSessionId) {
                return DB::connection('mysql_remote')
                    ->table('vu_semesters')
                    ->where('academic_session_id', $academicSessionId)
                    ->where('status', 1)
                    ->orderBy('semester_id')
                    ->value('id');
            });
        }

        // ── Course assignments (status=2 = approved/active), grouped by course ──
        $cacheKey = "course_assignments_{$academicSessionId}_{$vuSemesterId}";
        $ttl = 3600;

        $groupedData = Cache::remember($cacheKey, $ttl, function () use ($academicSessionId, $vuSemesterId) {
            $all = DB::connection('mysql_remote')
                ->table('course_assigneds')
                ->join('courses', 'course_assigneds.course_id', '=', 'courses.id')
                ->join('staff', 'course_assigneds.staff_id', '=', 'staff.id')
                ->where('course_assigneds.status', 2)
                ->where('course_assigneds.academic_session_id', $academicSessionId)
                ->where('course_assigneds.vu_semester_id', $vuSemesterId)
                ->select(
                    'course_assigneds.id as course_assigned_id',
                    'course_assigneds.course_id',
                    'course_assigneds.staff_id',
                    'courses.code as course_code',
                    'courses.title as course_title',
                    'courses.credit_load',
                    'staff.fname',
                    'staff.mname',
                    'staff.lname'
                )
                ->orderBy('courses.code')
                ->get();

            $grouped = $all->groupBy('course_id');
            return [
                'total_assignments' => $all->count(),
                'courses' => $grouped->map(function ($items, $courseId) {
                    $first = $items->first();
                    return [
                        'course_id' => $courseId,
                        'course_code' => $first->course_code,
                        'course_title' => $first->course_title,
                        'credit_load' => $first->credit_load,
                        'total_assignments' => $items->count(),
                        'staff' => $items->map(fn($i) => [
                            'staff_id' => $i->staff_id,
                            'full_name' => trim("{$i->fname} {$i->mname} {$i->lname}"),
                            'course_assigned_id' => $i->course_assigned_id,
                        ])->values(),
                    ];
                })->values(),
            ];
        });

        // Filter by search (can't cache when searching)
        $totalAssignments = $groupedData['total_assignments'];
        $courses = collect($groupedData['courses']);
        if ($search) {
            $needle = strtolower($search);
            $courses = $courses->filter(function ($c) use ($needle) {
                if (str_contains(strtolower($c['course_code']), $needle)) return true;
                if (str_contains(strtolower($c['course_title']), $needle)) return true;
                foreach ($c['staff'] as $s) {
                    if (str_contains(strtolower($s['full_name']), $needle)) return true;
                }
                return false;
            })->values();
        }

        // Paginate
        $total = $courses->count();
        $page = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $perPage;
        $paginated = $courses->slice($offset, $perPage)->values();

        // ── Session/semester info ──
        $session = Cache::remember('course_assignments_session', 3600, function () use ($academicSessionId) {
            return DB::connection('mysql_remote')
                ->table('academic_sessions')
                ->where('id', $academicSessionId)
                ->first();
        });

        $semesters = Cache::remember('course_assignments_semesters', 3600, function () use ($academicSessionId) {
            return DB::connection('mysql_remote')
                ->table('vu_semesters')
                ->where('academic_session_id', $academicSessionId)
                ->where('status', 1)
                ->select('id', 'semester_id')
                ->orderBy('semester_id')
                ->get();
        });

        return response()->json([
            'data' => $paginated,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int)ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
                'total_assignments' => $totalAssignments,
                'academic_session_id' => $academicSessionId,
                'session_batch' => $session?->batch,
                'active_semester_id' => $vuSemesterId,
                'semesters' => $semesters,
            ],
        ]);
    }
}
