<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AttendanceEventService;
use App\Models\Attendance\AttendanceInstitutionalEvent;
use App\Models\Attendance\AttendanceEventAttendance;
use App\Models\Attendance\AttendanceEventParticipant;

class TestEventStatus extends Command
{
    protected $signature = 'test:event-status {staff_id=1}';
    protected $description = 'Test attendance status for a staff member';

    public function handle()
    {
        $staffId = (int) $this->argument('staff_id');
        $service = app(AttendanceEventService::class);

        $eventIds = AttendanceEventParticipant::where('participant_id', $staffId)
            ->where('participant_type', 'staff')
            ->pluck('institutional_event_id');

        $events = AttendanceInstitutionalEvent::whereIn('id', $eventIds)->get();

        foreach ($events as $event) {
            $scans = AttendanceEventAttendance::where('institutional_event_id', $event->id)
                ->where('participant_id', $staffId)
                ->where('participant_type', 'staff')
                ->orderBy('timestamp')
                ->get();

            $result = $service->determineStatus($event, $scans);

            $this->info("Event {$event->id}: {$event->title} (status={$event->status})");
            $this->info("  Scans: {$scans->count()}");
            $this->info("  Attendance status: {$result['status']}");
            $this->info('');
        }

        return 0;
    }
}
