<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class GhostResultController extends Controller
{
    public function sessions(): JsonResponse
    {
        $sessions = Cache::remember('ghost_vu_sessions', 3600, function () {
            return DB::connection('mysql_remote')
                ->table('vu_sessions')
                ->orderBy('session', 'desc')
                ->get(['id', 'session', 'status']);
        });

        return response()->json($sessions);
    }

    public function semesters(Request $request): JsonResponse
    {
        $vuSessionId = $request->input('vu_session_id');
        if (! $vuSessionId) {
            return response()->json([]);
        }
        $key = "ghost_semesters_{$vuSessionId}";
        $semesters = Cache::remember($key, 3600, function () use ($vuSessionId) {
            return DB::connection('mysql_remote')
                ->table('course_regs')
                ->join('vu_semesters', 'vu_semesters.id', '=', 'course_regs.vu_semester_id')
                ->where('course_regs.vu_session_id', $vuSessionId)
                ->where('course_regs.is_course_reg', 2)
                ->select('vu_semesters.id', 'vu_semesters.semester_id')
                ->distinct()
                ->orderBy('vu_semesters.semester_id')
                ->get();
        });

        return response()->json($semesters);
    }

    public function searchStudents(Request $request): JsonResponse
    {
        $q = $request->input('q');
        if (! $q || strlen(trim($q)) < 1) {
            return response()->json([]);
        }

        $q = trim($q);
        $isNumeric = is_numeric($q);

        $students = Cache::remember('ghost_students_all', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('students')
                ->join('student_academics', 'student_academics.student_id', '=', 'students.id')
                ->where('student_academics.status', 1)
                ->select(
                    'students.id',
                    'students.fname',
                    'students.mname',
                    'students.lname',
                    'students.email',
                    'student_academics.matric_no',
                    'student_academics.level',
                    'student_academics.course_study_id',
                    'student_academics.department_id',
                    'student_academics.faculty_id'
                )
                ->get();
        });

        $qLower = strtolower($q);
        $results = $students->filter(function ($s) use ($q, $qLower, $isNumeric) {
            if ($isNumeric && $s->id == $q) {
                return true;
            }
            if ($s->matric_no && str_contains(strtolower($s->matric_no), $qLower)) {
                return true;
            }
            if (str_contains(strtolower($s->fname ?? ''), $qLower)) {
                return true;
            }
            if (str_contains(strtolower($s->mname ?? ''), $qLower)) {
                return true;
            }
            if (str_contains(strtolower($s->lname ?? ''), $qLower)) {
                return true;
            }
            if ($s->email && str_contains(strtolower($s->email), $qLower)) {
                return true;
            }

            return false;
        })->take(30)->values();

        $programs = Cache::remember('ghost_course_studies', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('course_studies')
                ->where('status', 1)
                ->pluck('name', 'id');
        });

        $departments = Cache::remember('ghost_departments', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('departments')
                ->where('status', 1)
                ->pluck('name', 'id');
        });

        $faculties = Cache::remember('ghost_faculties', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('faculties')
                ->where('status', 1)
                ->pluck('name', 'id');
        });

        $mapped = $results->map(function ($s) use ($programs, $departments, $faculties) {
            return [
                'id' => $s->id,
                'fname' => $s->fname,
                'mname' => $s->mname,
                'lname' => $s->lname,
                'email' => $s->email,
                'matric_no' => $s->matric_no,
                'level' => $s->level,
                'program' => $programs[$s->course_study_id] ?? null,
                'department' => $departments[$s->department_id] ?? null,
                'faculty' => $faculties[$s->faculty_id] ?? null,
            ];
        });

        return response()->json($mapped);
    }

    public function results(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|integer',
        ]);

        $studentId = $request->input('student_id');

        $courseRegs = DB::connection('mysql_remote')
            ->table('course_regs')
            ->where('student_id', $studentId)
            ->where('is_course_reg', 2)
            ->orderBy('vu_session_id', 'desc')
            ->orderBy('vu_semester_id', 'asc')
            ->get();

        $studentInfo = DB::connection('mysql_remote')
            ->table('students')
            ->where('id', $studentId)
            ->first(['id', 'fname', 'mname', 'lname', 'email']);

        $academic = DB::connection('mysql_remote')
            ->table('student_academics')
            ->where('student_id', $studentId)
            ->orderBy('id', 'desc')
            ->first(['matric_no', 'course_study_id']);

        if ($courseRegs->isEmpty()) {
            return response()->json([
                'student' => $studentInfo ? [
                    'id' => $studentInfo->id,
                    'fname' => $studentInfo->fname,
                    'mname' => $studentInfo->mname,
                    'lname' => $studentInfo->lname,
                    'email' => $studentInfo->email,
                    'matric_no' => $academic?->matric_no,
                ] : null,
                'approved' => [],
                'unapproved' => [],
            ]);
        }

        $courseStudyId = $academic?->course_study_id ?? 0;

        $courseIds = $courseRegs->pluck('course_id')->unique()->filter()->values();
        $courses = [];
        if ($courseIds->isNotEmpty()) {
            $coursesDb = DB::connection('mysql_remote')
                ->table('courses')
                ->whereIn('id', $courseIds)
                ->get(['id', 'code', 'title', 'credit_load']);
            foreach ($coursesDb as $c) {
                $courses[$c->id] = $c;
            }
        }

        $sessionIds = $courseRegs->pluck('vu_session_id')->unique()->filter()->values();
        $sessions = [];
        if ($sessionIds->isNotEmpty()) {
            $sessionsDb = DB::connection('mysql_remote')
                ->table('vu_sessions')
                ->whereIn('id', $sessionIds)
                ->get(['id', 'session']);
            foreach ($sessionsDb as $s) {
                $sessions[$s->id] = $s->session;
            }
        }

        $semesterIds = $courseRegs->pluck('vu_semester_id')->unique()->filter()->values();
        $semesters = [];
        if ($semesterIds->isNotEmpty()) {
            $semestersDb = DB::connection('mysql_remote')
                ->table('vu_semesters')
                ->whereIn('id', $semesterIds)
                ->get(['id', 'semester_id']);
            foreach ($semestersDb as $s) {
                $semesters[$s->id] = $s->semester_id;
            }
        }

        $gradeSettings = Cache::remember('ghost_grade_settings', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('grade_settings')
                ->get(['course_study_id', 'grading_category_id', 'min_score', 'max_score', 'grade', 'point', 'status']);
        });

        $courseGrading = Cache::remember('ghost_course_grading', 86400, function () {
            return DB::connection('mysql_remote')
                ->table('course_grading_systems')
                ->where('status', 1)
                ->get(['course_id', 'course_study_id', 'grading_category_id']);
        });

        $gradeDefaults = $gradeSettings->where('course_study_id', 0);
        $gradePerProgram = $courseStudyId > 0
            ? $gradeSettings->where('course_study_id', $courseStudyId)
            : collect();

        $grouped = [];

        foreach ($courseRegs as $reg) {
            $course = $courses[$reg->course_id] ?? null;
            $creditLoad = $course->credit_load ?? 0;

            $total = ((int) ($reg->ca_one ?? 0))
                + ((int) ($reg->ca_two ?? 0))
                + ((int) ($reg->ca_three ?? 0))
                + ((int) ($reg->examination ?? 0));

            if ($total != (int) $reg->total && $total < (int) $reg->total) {
                $total = (int) $reg->total;
            }

            $matchedGrade = null;

            $courseGradingCat = $courseGrading->firstWhere(fn ($c) => $c->course_id == $reg->course_id && $c->course_study_id == $courseStudyId);
            if ($courseGradingCat) {
                $catGrades = $gradeSettings->filter(fn ($g) => $g->course_study_id == $courseGradingCat->course_study_id
                    && $g->grading_category_id == $courseGradingCat->grading_category_id
                );
                foreach ($catGrades as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (! $matchedGrade && $gradePerProgram->isNotEmpty()) {
                foreach ($gradePerProgram as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (! $matchedGrade) {
                foreach ($gradeDefaults as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (! $matchedGrade) {
                $matchedGrade = $gradeDefaults->last();
            }

            $gradeLetter = $matchedGrade->grade;
            $gradePoint = (float) $matchedGrade->point;
            $weight = $gradePoint * $creditLoad;

            $entry = [
                'course_id' => $reg->course_id,
                'code' => $course->code ?? '',
                'title' => $course->title ?? '',
                'credit_load' => $creditLoad,
                'ca_one' => (float) ($reg->ca_one ?? 0),
                'ca_two' => (float) ($reg->ca_two ?? 0),
                'ca_three' => (float) ($reg->ca_three ?? 0),
                'examination' => (float) ($reg->examination ?? 0),
                'total' => $total,
                'grade' => $gradeLetter,
                'point' => $gradePoint,
                'weight' => $weight,
                'level' => $reg->level,
                'status' => (int) $reg->status,
                'is_vc_approval' => (int) $reg->is_vc_approval,
                'vu_session_id' => $reg->vu_session_id,
                'vu_semester_id' => $reg->vu_semester_id,
            ];

            $isPublished = (int) $reg->is_vc_approval === 9;
            $groupKey = $reg->vu_session_id.'_'.$reg->vu_semester_id;

            if (! isset($grouped[$groupKey])) {
                $grouped[$groupKey] = [
                    'vu_session_id' => $reg->vu_session_id,
                    'vu_semester_id' => $reg->vu_semester_id,
                    'session' => $sessions[$reg->vu_session_id] ?? "Session #{$reg->vu_session_id}",
                    'semester' => $semesters[$reg->vu_semester_id] ?? "Semester #{$reg->vu_semester_id}",
                    'published' => [],
                    'unpublished' => [],
                    'published_total_weight' => 0,
                    'published_total_credit' => 0,
                    'unpublished_total_weight' => 0,
                    'unpublished_total_credit' => 0,
                ];
            }

            if ($isPublished) {
                $grouped[$groupKey]['published'][] = $entry;
                $grouped[$groupKey]['published_total_weight'] += $weight;
                $grouped[$groupKey]['published_total_credit'] += $creditLoad;
            } else {
                $grouped[$groupKey]['unpublished'][] = $entry;
                $grouped[$groupKey]['unpublished_total_weight'] += $weight;
                $grouped[$groupKey]['unpublished_total_credit'] += $creditLoad;
            }
        }

        $publishedGroups = [];
        $unpublishedGroups = [];

        foreach ($grouped as $gk => $g) {
            $publishedGpa = $g['published_total_credit'] > 0
                ? round($g['published_total_weight'] / $g['published_total_credit'], 2) : null;
            $unpublishedGpa = $g['unpublished_total_credit'] > 0
                ? round($g['unpublished_total_weight'] / $g['unpublished_total_credit'], 2) : null;

            if (! empty($g['published'])) {
                $publishedGroups[] = [
                    'session' => $g['session'],
                    'semester' => $g['semester'],
                    'courses' => $g['published'],
                    'gpa' => $publishedGpa,
                ];
            }
            if (! empty($g['unpublished'])) {
                $unpublishedGroups[] = [
                    'session' => $g['session'],
                    'semester' => $g['semester'],
                    'courses' => $g['unpublished'],
                    'gpa' => $unpublishedGpa,
                ];
            }
        }

        return response()->json([
            'student' => $studentInfo ? [
                'id' => $studentInfo->id,
                'fname' => $studentInfo->fname,
                'mname' => $studentInfo->mname,
                'lname' => $studentInfo->lname,
                'email' => $studentInfo->email,
                'matric_no' => $academic?->matric_no,
            ] : null,
            'approved' => $publishedGroups,
            'unapproved' => $unpublishedGroups,
        ]);
    }
}
