<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('attendance:process-events')->everyMinute();
Schedule::command('attendance:evaluate-eligibility')->hourly();
Schedule::command('attendance:weekly-compliance')->weekly()->saturdays()->at('08:00');
Schedule::command('attendance:process-exam-leave')->hourly();
