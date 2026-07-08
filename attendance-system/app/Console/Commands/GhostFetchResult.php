<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GhostFetchResult extends Command
{
    protected $signature = 'ghost:fetch-result {student_id} {level} {semester_id}';
    protected $description = 'Fetch result for a student by level and semester, showing grade provenance';

    public function handle(): void
    {
        $studentId = (int) $this->argument('student_id');
        $level = (int) $this->argument('level');
        $semesterId = (int) $this->argument('semester_id');

        $this->info("Fetching result for student #{$studentId}, Level {$level}, Semester {$semesterId}");
        $this->newLine();

        // 1. STUDENT INFO — table: students
        $student = DB::connection('mysql_remote')
            ->table('students')
            ->where('id', $studentId)
            ->first(['id', 'fname', 'mname', 'lname', 'email']);

        if (!$student) {
            $this->error("Student #{$studentId} not found in [students] table.");
            return;
        }

        // 2. ACADEMIC INFO — table: student_academics
        $academic = DB::connection('mysql_remote')
            ->table('student_academics')
            ->where('student_id', $studentId)
            ->orderBy('id', 'desc')
            ->first(['matric_no', 'course_study_id', 'level', 'department_id', 'faculty_id']);

        $this->line("————————————————————————————————————————————————————");
        $this->info(" STUDENT");
        $this->line("————————————————————————————————————————————————————");
        $this->warn(" Source: [students] table");
        $this->line("   ID:        {$student->id}");
        $this->line("   Name:      {$student->fname} {$student->mname} {$student->lname}");
        $this->line("   Email:     {$student->email}");
        if ($academic) {
            $this->warn(" Source: [student_academics] table");
            $this->line("   Matric No: {$academic->matric_no}");
            $this->line("   Program:   {$academic->course_study_id}");
        }
        $this->newLine();

        // 3. Find vu_semester_id for the given semester_id — table: vu_semesters
        $vuSemester = DB::connection('mysql_remote')
            ->table('vu_semesters')
            ->where('semester_id', $semesterId)
            ->where('status', 1)
            ->first(['id']);

        if (!$vuSemester) {
            $this->error("No active semester found with semester_id = {$semesterId} in [vu_semesters].");
            return;
        }

        // 4. COURSE REGISTRATIONS — table: course_regs
        //    Filters: student_id, level, vu_semester_id, is_course_reg=2 (registered)
        $courseRegs = DB::connection('mysql_remote')
            ->table('course_regs')
            ->where('student_id', $studentId)
            ->where('level', $level)
            ->where('vu_semester_id', $vuSemester->id)
            ->where('is_course_reg', 2)
            ->orderBy('id')
            ->get();

        if ($courseRegs->isEmpty()) {
            $this->warn("No course registrations found in [course_regs] for student #{$studentId}, level {$level}, vu_semester_id = {$vuSemester->id}.");
            return;
        }

        // 5. Fetch session info — table: vu_sessions
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

        // 6. Fetch course details — table: courses
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

        // 7. GRADE SETTINGS — table: grade_settings
        $gradeSettings = DB::connection('mysql_remote')
            ->table('grade_settings')
            ->get(['course_study_id', 'grading_category_id', 'min_score', 'max_score', 'grade', 'point', 'status']);

        // 8. COURSE GRADING SYSTEMS — table: course_grading_systems
        $courseGrading = DB::connection('mysql_remote')
            ->table('course_grading_systems')
            ->where('status', 1)
            ->get(['course_id', 'course_study_id', 'grading_category_id']);

        $courseStudyId = $academic?->course_study_id ?? 0;
        $gradeDefaults = $gradeSettings->where('course_study_id', 0);
        $gradePerProgram = $courseStudyId > 0
            ? $gradeSettings->where('course_study_id', $courseStudyId)
            : collect();

        // 9. Print header for course results
        $this->line("————————————————————————————————————————————————————————————————————————————————————————————————————————————");
        $this->info(" COURSE RESULTS");
        $this->line("————————————————————————————————————————————————————————————————————————————————————————————————————————————");

        $sessionLabel = $sessions->first() ?? "Session #{$courseRegs->first()->vu_session_id}";
        $this->line(" Session: {$sessionLabel}  |  Level: {$level}  |  Semester: {$semesterId}");
        $this->newLine();

        // 10. Column provenance legend
        $this->warn(" DATA PROVENANCE (which table each column comes from):");
        $this->line("   course_code / course_title  → [courses] table");
        $this->line("   credit_load                 → [courses] table");
        $this->line("   ca_one / ca_two / ca_three  → [course_regs] table");
        $this->line("   examination                 → [course_regs] table");
        $this->line("   total                       → ca_one+ca_two+ca_three+examination (computed)");
        $this->line("   grade / point               → [grade_settings] table  (matched via total score)");
        $this->line("   is_published                → [course_regs] is_vc_approval=9 (published) vs others (unpublished)");
        $this->newLine();

        $this->line("———" . str_repeat("——", 28));
        $this->line("  GRADE SCALE APPLIED");
        $this->line("———" . str_repeat("——", 28));

        // Show the grade scale being used
        $this->warn(" Source: [grade_settings] table (course_study_id = {$courseStudyId})");
        $displayGrades = $gradePerProgram->isNotEmpty() ? $gradePerProgram : $gradeDefaults;
        $this->line("  MinScore  MaxScore  Grade  Point");
        foreach ($displayGrades->sortBy('min_score') as $g) {
            $this->line("  {$g->min_score}\t     {$g->max_score}\t     {$g->grade}\t     {$g->point}");
        }
        $this->newLine();

        // 11. Print each course
        $this->line("———" . str_repeat("——", 28));
        $this->line("  COURSE BREAKDOWN");
        $this->line("———" . str_repeat("——", 28));

        $totalWeight = 0;
        $totalCredit = 0;

        foreach ($courseRegs as $reg) {
            $course = $courses[$reg->course_id] ?? null;
            $creditLoad = $course->credit_load ?? 0;

            $ca1 = (float) ($reg->ca_one ?? 0);
            $ca2 = (float) ($reg->ca_two ?? 0);
            $ca3 = (float) ($reg->ca_three ?? 0);
            $exam = (float) ($reg->examination ?? 0);
            $total = $ca1 + $ca2 + $ca3 + $exam;

            if ($total != (int) $reg->total && $total < (int) $reg->total) {
                $total = (int) $reg->total;
            }

            // Match grade
            $matchedGrade = null;

            $courseGradingCat = $courseGrading->firstWhere(fn($c) => $c->course_id == $reg->course_id && $c->course_study_id == $courseStudyId);
            if ($courseGradingCat) {
                $catGrades = $gradeSettings->filter(fn($g) =>
                    $g->course_study_id == $courseGradingCat->course_study_id
                    && $g->grading_category_id == $courseGradingCat->grading_category_id
                );
                foreach ($catGrades as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (!$matchedGrade && $gradePerProgram->isNotEmpty()) {
                foreach ($gradePerProgram as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (!$matchedGrade) {
                foreach ($gradeDefaults as $g) {
                    if ($total >= $g->min_score && $total <= $g->max_score) {
                        $matchedGrade = $g;
                        break;
                    }
                }
            }

            if (!$matchedGrade) {
                $matchedGrade = $gradeDefaults->last();
            }

            $gradeLetter = $matchedGrade->grade;
            $gradePoint = (float) $matchedGrade->point;
            $weight = $gradePoint * $creditLoad;

            $isPublished = (int) $reg->is_vc_approval === 9;

            $this->line(str_repeat("─", 100));
            $this->line("  {$course->code} - {$course->title}");
            $this->line(str_repeat("─", 100));
            $this->line("  Source → [courses]     | ID: {$reg->course_id}  | Credit Load: {$creditLoad}");
            $this->line("  Source → [course_regs]  | CA1: {$ca1}  |  CA2: {$ca2}  |  CA3: {$ca3}  |  Exam: {$exam}");
            $this->line("  Source → [course_regs]  | status={$reg->status}  |  is_vc_approval={$reg->is_vc_approval}");
            $this->line("  Total: {$total}  |  Grade: {$gradeLetter}  |  Point: {$gradePoint}  |  Weight: {$weight}");
            $details = $matchedGrade->course_study_id > 0
                ? "program-specific (course_study_id={$matchedGrade->course_study_id})"
                : ($courseGradingCat ? "course-specific (category_id={$courseGradingCat->grading_category_id})" : "default global");
            $this->line("  Grade sourced from → [grade_settings]  |  Match: {$details}");
            $this->line("  Status: " . ($isPublished ? "✓ PUBLISHED (is_vc_approval=9)" : "✗ UNPUBLISHED (is_vc_approval={$reg->is_vc_approval})"));
            $this->newLine();

            $totalWeight += $weight;
            $totalCredit += $creditLoad;
        }

        // 12. Summary
        $this->line("———" . str_repeat("——", 28));
        $this->line("  SUMMARY");
        $this->line("———" . str_repeat("——", 28));
        $gpa = $totalCredit > 0 ? round($totalWeight / $totalCredit, 2) : 0;
        $this->line("  Total Credit Load: {$totalCredit}");
        $this->line("  Total Weight:      {$totalWeight}");
        $this->line("  GPA:               {$gpa}");
        $this->newLine();

        $this->line("————————————————————————————————————————————————————");
        $this->info(" TABLES USED");
        $this->line("————————————————————————————————————————————————————");
        $this->line("  [students]           → Student personal info");
        $this->line("  [student_academics]  → Matric no, program, level");
        $this->line("  [course_regs]        → Course enrollments, scores, approval status");
        $this->line("  [courses]            → Course code, title, credit load");
        $this->line("  [vu_sessions]        → Academic session label");
        $this->line("  [vu_semesters]       → Semester mapping (semester_id → id)");
        $this->line("  [grade_settings]     → Grade boundaries (min/max score → letter + point)");
        $this->line("  [course_grading_systems] → Per-course grading category override");
        $this->newLine();

        if (!$gradePerProgram->isEmpty()) {
            $this->warn(" Note: Grade matched using program-specific scale (course_study_id={$courseStudyId}).");
        }
    }
}
