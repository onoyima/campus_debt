<?php

namespace App\Console\Commands;

use App\Services\ExeatLeaveAutoMarkService;
use Illuminate\Console\Command;

class ProcessExeatLeave extends Command
{
    protected $signature = 'attendance:process-exeat-leave {--exeat-id=}';
    protected $description = 'Auto-mark attendance records as exeat_leave from approved exeat requests';

    public function handle(ExeatLeaveAutoMarkService $service): void
    {
        $exeatId = $this->option('exeat-id');

        if ($exeatId) {
            $this->info("Processing exeat leave for exeat request #{$exeatId}...");
        } else {
            $this->info('Processing exeat leave for all approved exeat requests...');
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
