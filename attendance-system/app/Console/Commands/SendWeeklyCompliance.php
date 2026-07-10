<?php

namespace App\Console\Commands;

use App\Jobs\SendBulkWeeklyComplianceJob;
use Illuminate\Console\Command;

class SendWeeklyCompliance extends Command
{
    protected $signature = 'attendance:weekly-compliance';

    protected $description = 'Queue weekly compliance notifications for all students';

    public function handle(): void
    {
        $this->info('Dispatching weekly compliance notifications job...');
        SendBulkWeeklyComplianceJob::dispatch();
        $this->info('Job dispatched successfully.');
    }
}
