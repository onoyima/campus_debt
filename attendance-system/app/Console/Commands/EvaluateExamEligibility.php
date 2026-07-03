<?php

namespace App\Console\Commands;

use App\Services\EligibilityEngineService;
use Illuminate\Console\Command;

class EvaluateExamEligibility extends Command
{
    protected $signature = 'attendance:evaluate-eligibility {--student-id=} {--course-id=}';
    protected $description = 'Evaluate exam eligibility for all or specific students/courses';

    public function handle(EligibilityEngineService $service): void
    {
        $studentId = $this->option('student-id');
        $courseId = $this->option('course-id');

        if ($studentId && $courseId) {
            $this->info("Evaluating student {$studentId} for course {$courseId}...");
            $result = $service->evaluate((int)$studentId, (int)$courseId);
            $this->info("Result: {$result->attendance_percentage}% - Status: {$result->eligibilityStatus?->display_name}");
        } elseif ($studentId) {
            $this->info("Evaluating all courses for student {$studentId}...");
            $results = $service->evaluateStudent((int)$studentId);
            $this->info("Evaluated " . count($results) . " course(s).");
        } elseif ($courseId) {
            $this->info("Evaluating all students for course {$courseId}...");
            $results = $service->evaluateCourse((int)$courseId);
            $this->info("Evaluated " . count($results) . " student(s).");
        } else {
            $this->info('Evaluating all students for all courses...');
            $results = $service->evaluateAll();
            $this->info("Evaluated " . count($results) . " records.");
        }
    }
}
