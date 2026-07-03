<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceSession extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_sessions';

    protected $fillable = [
        'course_assigned_id',
        'institutional_event_id',
        'staff_id',
        'session_type',
        'title',
        'session_date',
        'opens_at',
        'closes_at',
        'grace_period_end',
        'status',
        'venue_id',
        'attendance_methods',
        'max_participants',
        'notes',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'opens_at' => 'datetime',
            'closes_at' => 'datetime',
            'grace_period_end' => 'datetime',
            'attendance_methods' => 'array',
            'metadata' => 'array',
        ];
    }

    // references remote course_assigneds.id
    // references remote staff.id

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'session_id');
    }

    public function excuses()
    {
        return $this->hasMany(AttendanceExcuse::class, 'session_id');
    }
}
