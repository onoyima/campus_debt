<?php

namespace App\Models\Attendance;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class AttendanceEventWindow extends Model
{
    protected $connection = 'mysql';

    protected $table = 'attendance_event_windows';

    protected $fillable = [
        'institutional_event_id',
        'window_date',
        'attendance_open_time',
        'attendance_close_time',
        'grace_period_minutes',
        'clock_out_open_time',
        'clock_out_close_time',
        'status',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'window_date' => 'date',
            'grace_period_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function event()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    /**
     * Check if this window is currently open for attendance
     */
    public function isOpenAt(Carbon $time): bool
    {
        $dateStr = $this->window_date->format('Y-m-d');
        $open = Carbon::parse($dateStr.' '.$this->attendance_open_time);
        $close = Carbon::parse($dateStr.' '.$this->attendance_close_time);

        return $time->between($open, $close);
    }

    /**
     * Check if this window's clock-out is currently open
     */
    public function isClockOutOpenAt(Carbon $time): bool
    {
        if (! $this->clock_out_open_time || ! $this->clock_out_close_time) {
            return false;
        }

        $dateStr = $this->window_date->format('Y-m-d');
        $outOpen = Carbon::parse($dateStr.' '.$this->clock_out_open_time);
        $outClose = Carbon::parse($dateStr.' '.$this->clock_out_close_time);

        return $time->between($outOpen, $outClose);
    }

    /**
     * Build time windows array compatible with AttendanceEventService
     */
    public function buildWindows(): array
    {
        $dateStr = $this->window_date->format('Y-m-d');

        $open = Carbon::parse($dateStr.' '.$this->attendance_open_time);
        $close = Carbon::parse($dateStr.' '.$this->attendance_close_time);

        $graceMinutes = max(0, (int) ($this->grace_period_minutes ?? 0));
        $checkInClose = $open->copy()->addMinutes($graceMinutes);

        return [
            'event_start' => $open,
            'event_end' => $close,
            'check_in_open' => $open,
            'check_in_close' => $checkInClose,
            'late_check_in_open' => $checkInClose->copy()->addMinute(),
            'late_check_in_close' => $close,
            'check_out_open' => $this->clock_out_open_time
                ? Carbon::parse($dateStr.' '.$this->clock_out_open_time)
                : $close,
            'check_out_close' => $this->clock_out_close_time
                ? Carbon::parse($dateStr.' '.$this->clock_out_close_time)
                : $close->copy()->addHour(),
        ];
    }
}
