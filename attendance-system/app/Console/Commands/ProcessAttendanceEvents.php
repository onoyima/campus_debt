<?php

namespace App\Console\Commands;

use App\Services\EligibilityEngineService;
use App\Services\EventLifecycleService;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class ProcessAttendanceEvents extends Command
{
    protected $signature = 'attendance:process-events';
    protected $description = 'Process active events: activate scheduled, close expired, generate penalties';

    public function handle(EventLifecycleService $service): void
    {
        $this->info('Processing event lifecycle...');
        $service->processActiveEvents();
        $this->info('Event lifecycle processing completed.');
    }
}
