<?php

namespace App\Console\Commands;

use App\Services\ExamLeaveAutoMarkService;
use Illuminate\Console\Command;

class ProcessExamLeaveFromExeat extends Command
{
    protected $signature = 'attendance:process-exam-leave {--exeat-id=}';
    protected $description = 'Auto-mark attendance records as exam_leave from approved exeat requests';

    public function handle(ExamLeaveAutoMarkService $service): void
    {
        $exeatId = $this->option('exeat-id');

        if ($exeatId) {
            $this->info("Processing exam leave for exeat request #{$exeatId}...");
        } else {
            $this->info('Processing exam leave for all approved exeat requests...');
        }

        $result = $service->process($exeatId ? (int)$exeatId : null);

        $this->info("Processed: {$result['processed']}");
        $this->info("Created: {$result['created']}");
        $this->info("Skipped: {$result['skipped']}");
        $this->info("Failed: {$result['failed']}");

        if (!empty($result['errors'])) {
            $this->newLine();
            $this->error('Errors:');
            foreach ($result['errors'] as $error) {
                $this->error("  - {$error}");
            }
        }

        if ($result['failed'] > 0) {
            $this->fail('Some records failed to process.');
        }
    }
}
