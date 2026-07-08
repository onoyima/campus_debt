<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceEventUnexpected extends Model
{
    use SoftDeletes;

    protected $table = 'attendance_event_unexpected';

    protected $fillable = [
        'institutional_event_id',
        'participant_type',
        'participant_id',
        'expected_participant_type',
        'reason',
        'attendance_method',
        'verified_by_terminal_id',
        'timestamp',
        'venue_id',
        'sync_status',
        'metadata',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'metadata' => 'array',
    ];

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function terminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'verified_by_terminal_id');
    }

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }
}
