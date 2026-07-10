<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AttendanceEventService;
use App\Models\Attendance\AttendanceInstitutionalEvent;

class TestWindows extends Command
{
    protected $signature = 'test:windows {event_id=9}';
    protected $description = 'Test getWindows for an event';

    public function handle()
    {
        $eventId = (int) $this->argument('event_id');
        $service = app(AttendanceEventService::class);
        $event = AttendanceInstitutionalEvent::find($eventId);

        if (!$event) {
            $this->error("Event {$eventId} not found");
            return 1;
        }

        $windows = $service->getWindows($event);

        $this->info("Event {$event->id}: {$event->title}");
        $this->info("  check_in_open: " . $windows['check_in_open']->toDateTimeString());
        $this->info("  check_in_close: " . $windows['check_in_close']->toDateTimeString());
        $this->info("  late_check_in_open: " . $windows['late_check_in_open']->toDateTimeString());
        $this->info("  late_check_in_close: " . $windows['late_check_in_close']->toDateTimeString());
        $this->info("  check_out_open: " . $windows['check_out_open']->toDateTimeString());
        $this->info("  check_out_close: " . $windows['check_out_close']->toDateTimeString());
        $this->info("  now: " . now()->toDateTimeString());

        return 0;
    }
}
