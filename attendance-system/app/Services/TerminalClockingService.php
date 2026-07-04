<?php

namespace App\Services;

use App\Models\Attendance\AttendanceSession;
use App\Models\Attendance\AttendanceTerminal;
use Carbon\Carbon;

class TerminalClockingService
{
    const MODE_ANY = 'any';
    const MODE_CLASS = 'class_only';
    const MODE_STAFF = 'staff_only';
    const MODE_EVENT = 'event_only';

    public function canClockFor(AttendanceTerminal $terminal, string $clockingType): bool
    {
        $mode = $terminal->clocking_mode ?? self::MODE_ANY;

        return match ($mode) {
            self::MODE_ANY => true,
            self::MODE_CLASS => $clockingType === 'class',
            self::MODE_STAFF => $clockingType === 'staff',
            self::MODE_EVENT => $clockingType === 'event',
            default => false,
        };
    }

    public function isVenueAllowed(AttendanceTerminal $terminal, ?int $targetVenueId): bool
    {
        if (!$targetVenueId) return true;
        if ($terminal->allow_any_venue) return true;
        return $terminal->venue_id === $targetVenueId;
    }

    public function findActiveSessionForTerminal(AttendanceTerminal $terminal): ?AttendanceSession
    {
        $venueIds = $terminal->allow_any_venue
            ? null
            : [$terminal->venue_id];

        $query = AttendanceSession::where('status', 'active')
            ->where('session_date', now()->toDateString())
            ->where('opens_at', '<=', now())
            ->where('closes_at', '>=', now());

        if ($venueIds) {
            $query->whereIn('venue_id', $venueIds);
        }

        return $query->first();
    }

    public function findActiveSessionsAtVenue(int $venueId, ?Carbon $at = null): iterable
    {
        $at = $at ?? now();

        return AttendanceSession::where('status', 'active')
            ->where('venue_id', $venueId)
            ->whereDate('session_date', $at->toDateString())
            ->where('opens_at', '<=', $at)
            ->where('closes_at', '>=', $at)
            ->get();
    }

    public function getConfig(AttendanceTerminal $terminal): array
    {
        $activeSessions = [];
        if ($terminal->venue_id) {
            $activeSessions = $this->findActiveSessionsAtVenue($terminal->venue_id);
        }

        return [
            'id' => $terminal->id,
            'device_id' => $terminal->device_id,
            'clocking_mode' => $terminal->clocking_mode ?? self::MODE_ANY,
            'venue_id' => $terminal->venue_id,
            'venue_name' => $terminal->venue?->name,
            'allow_any_venue' => (bool) ($terminal->allow_any_venue ?? false),
            'is_active' => (bool) ($terminal->is_active ?? false),
            'connection_status' => $terminal->connection_status ?? 'offline',
            'server_time' => now()->toIso8601String(),
            'timezone' => config('app.timezone', 'UTC'),
            'active_sessions' => $activeSessions->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'session_type' => $s->session_type,
                'session_date' => $s->session_date?->toDateString(),
                'opens_at' => $s->opens_at?->toDateTimeString(),
                'closes_at' => $s->closes_at?->toDateTimeString(),
                'course_assigned_id' => $s->course_assigned_id,
            ]),
        ];
    }
}
