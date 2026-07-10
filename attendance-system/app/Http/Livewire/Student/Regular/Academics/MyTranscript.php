<?php

namespace App\Http\Livewire\Student\Regular\Academics;

use App\Http\Livewire\Student\StudentComponent;
use App\Models\CourseReg;
use App\Models\StudentAcademic;
use App\Models\VuSemester;
use App\Services\DataRetrievalService;
use App\Services\TransferStudentService;

class MyTranscript extends StudentComponent
{
    public $search;

    protected $queryString = ['search'];

    public $state = [];

    public $showEditModal = false;

    public $courses = [];

    public $transcriptSessions = [];

    public $summary = [];

    public $all_results_by_levels = [];

    private $dataRetrievalService;

    private $transferStudentService;

    public $transfer_student = [];

    public $checker_for_transfer = false;

    /**
     * Create a new instance of the service.
     */
    public function boot(DataRetrievalService $dataRetrievalService, TransferStudentService $transferStudentService)
    {
        $this->dataRetrievalService = $dataRetrievalService;

        $this->transferStudentService = $transferStudentService;
    }

    public function render()
    {

        $this->checker_for_transfer = $this->transferStudentService->isTransfer(auth('student')->user()->id);

        if ($this->checker_for_transfer) {

            $this->transfer_student = $this->transferStudentService->processResult(auth('student')->user()->id);

        }

        $student_acad = StudentAcademic::where('student_id', auth('student')->user()->id)->first();

        $all_results = CourseReg::where('student_id', auth('student')->user()->id)
            ->where('is_course_reg', 2)->where('is_vc_approval', 9)->where('status', 3)->get();

        $all_results_by_levels = $all_results->groupBy(['level'])->sortKeys();

        // dd($all_results_by_levels);

        $i = 1;

        $credit_load = 0;

        if ($all_results_by_levels->count() > 0) {
            $grand_total_weight = 0;

            $grand_total_credit_load = 0;

            if ($this->checker_for_transfer) {

                $transfer_grade = $this->transferStudentService->cumulativeGP(auth('student')->user()->id);

                $grand_total_weight = $grand_total_weight + $transfer_grade['TGP'];

                $grand_total_credit_load = $grand_total_credit_load + $transfer_grade['TC'];

            }

            foreach ($all_results_by_levels as $level_key => $all_results_by_level) {

                $all_results_by_semesters = $all_results_by_level->groupBy(['vu_semester_id'])->sortKeys();

                // dd($all_results_by_semesters);

                foreach ($all_results_by_semesters as $semester_key => $all_results_by_semester) {
                    $total_credit_load = 0;
                    $weight = 0;
                    $total_weight = 0;
                    $cgpa = 0;

                    $vu_semester = VuSemester::where('id', $semester_key)->first();

                    if ($vu_semester) {
                        if ($vu_semester->semester_id == 1) {
                            $semester = 'First Semester';
                        } else {
                            $semester = 'Second Semester';
                        }

                        $session = $vu_semester->academic_session->vu_session->session;

                        // $credit_load = 0;

                        foreach ($all_results_by_semester as $course_reg) {

                            $credit_load = $course_reg->departmental_reg->credit_load;

                            $total = (int) $course_reg->ca_one + (int) $course_reg->ca_two + (int) $course_reg->ca_three + (int) $course_reg->examination;

                            if ($total != $course_reg->total && $total < $course_reg->total) {
                                $total = $course_reg->total;
                            }

                            // dd($course_reg->course->credit_load);

                            // $weight = $this->dataRetrievalService->calculateWeights($total, $student_acad->course_study_id, $credit_load);

                            // $grade = $this->dataRetrievalService->calculateGrades($total, $student_acad->course_study_id);

                            $gradingSystem = $this->dataRetrievalService->calculateGrades($total, $student_acad->course_study_id, $course_reg->course_id);

                            $weight = $gradingSystem->point * $credit_load;

                            $grade = $gradingSystem->grade;

                            $total_weight += $weight;

                            $grand_total_weight += $weight;

                            $total_credit_load += $credit_load;

                            $grand_total_credit_load += $credit_load;

                            if ($grade == 'F') {
                                $pass = 'Fail';
                            } else {
                                $pass = 'Pass';
                            }

                            $this->courses[] =
                            [
                                'id' => $course_reg->id,
                                'title' => $course_reg->departmental_reg->title,
                                'code' => $course_reg->departmental_reg->code,
                                'credit_load' => $credit_load,
                                'semester_offered' => $course_reg->departmental_reg->semester_offered,
                                'score' => $total,
                                'grade' => $grade,
                                'pass' => $pass,
                            ];
                        }

                        if ($total_weight > 0 || $total_credit_load > 0) {
                            $gpa = $total_weight / $total_credit_load;
                        } else {
                            $gpa = 0;
                        }

                        if ($grand_total_weight > 0 || $grand_total_credit_load > 0) {
                            $cgpa = $grand_total_weight / $grand_total_credit_load;
                        } else {
                            $cgpa = 0;
                        }
                        $this->transcriptSessions[$i] =
                            [
                                'courses' => $this->courses,
                                'level' => $level_key,
                                'semester' => $semester,
                                'session' => $session,
                                'TCL' => $total_credit_load,
                                'TCU' => $total_weight,
                                'GPA' => number_format((float) $gpa, 2, '.', ''),
                                'TC' => $grand_total_credit_load,
                                'TGP' => $grand_total_weight,
                                'CGPA' => number_format((float) $cgpa, 2, '.', ''),
                            ];

                        $this->courses = [];

                    }

                    $total_credit_load = 0;

                    $total_weight = 0;

                    $i++;

                }

                $this->summary[] =
                [

                    'TC' => $grand_total_credit_load,
                    'TGP' => $grand_total_weight,
                    'CGPA' => number_format((float) $cgpa, 2, '.', ''),
                ];

            }

        }

        // dd($this->transcriptSessions);

        return view('livewire.student.regular.academics.my-transcript', [

            'student_acad' => $student_acad,

        ]);
    }
}
