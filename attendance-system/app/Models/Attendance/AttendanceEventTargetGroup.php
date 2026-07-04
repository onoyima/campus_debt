<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceEventTargetGroup extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_event_target_groups';

    const UPDATED_AT = null;

    protected $fillable = [
        'institutional_event_id',
        'target_type',
        'target_id',
        'schedule_day', 'schedule_time', 'schedule_frequency', 'schedule_start_date', 'schedule_end_date', 'is_recurring',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'schedule_start_date' => 'datetime',
            'schedule_end_date' => 'datetime',
            'is_recurring' => 'boolean',
        ];
    }

    public function scopeForDay($query, string $day)
    {
        return $query->where('schedule_day', $day);
    }

    public function scopeRecurring($query)
    {
        return $query->where('is_recurring', true);
    }

    /**
     * Scope to target type (faculty, department, level, individual)
     */
    public function scopeTargetType($query, string $type)
    {
        return $query->where('target_type', $type);
    }

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }
}
