<?php

namespace App\Console\Commands;

use App\Models\Attendance\AttendanceEventWindow;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateEventWindows extends Command
{
    protected $signature = 'attendance:generate-windows {--event-id=} {--all}';

    protected $description = 'Generate per-day attendance windows for existing events';

    public function handle(): int
    {
        $query = AttendanceInstitutionalEvent::where('is_active', true)
            ->where('status', 'active');

        if ($this->option('event-id')) {
            $query->where('id', $this->option('event-id'));
        }

        $events = $query->get();

        if ($events->isEmpty()) {
            $this->warn('No active events found.');

            return self::SUCCESS;
        }

        foreach ($events as $event) {
            $existingWindows = AttendanceEventWindow::where('institutional_event_id', $event->id)->count();
            if ($existingWindows > 0) {
                $this->info("Event {$event->id} ({$event->event_name}): already has {$existingWindows} windows, skipping.");

                continue;
            }

            $appTimezone = config('app.timezone', 'Africa/Lagos');
            $start = Carbon::parse($event->start_date)->timezone($appTimezone)->startOfDay();
            $end = $event->end_date ? Carbon::parse($event->end_date)->timezone($appTimezone)->startOfDay() : $start->copy();

            $count = 0;
            $current = $start->copy();
            while ($current->lte($end)) {
                AttendanceEventWindow::create([
                    'institutional_event_id' => $event->id,
                    'window_date' => $current->format('Y-m-d'),
                    'attendance_open_time' => $event->attendance_open_time,
                    'attendance_close_time' => $event->attendance_close_time,
                    'grace_period_minutes' => $event->grace_period_minutes ?? 0,
                    'clock_out_open_time' => $event->clock_out_open_time ?? null,
                    'clock_out_close_time' => $event->clock_out_close_time ?? null,
                ]);
                $current->addDay();
                $count++;
            }

            $this->info("Event {$event->id} ({$event->event_name}): created {$count} window(s).");
        }

        return self::SUCCESS;
    }
}
