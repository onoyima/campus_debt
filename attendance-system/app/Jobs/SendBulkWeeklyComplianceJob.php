<?php

namespace App\Jobs;

use App\Models\Attendance\AttendanceRecord;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendBulkWeeklyComplianceJob implements ShouldQueue
{
    use Queueable;

    public function handle(NotificationService $notificationService): void
    {
        Log::info('Starting weekly compliance notifications...');
        $count = $notificationService->sendBulkWeeklyCompliance();
        Log::info("Completed: {$count} weekly compliance notifications sent.");
    }
}
