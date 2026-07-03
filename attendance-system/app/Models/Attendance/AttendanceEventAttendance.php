<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceEventAttendance extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_event_attendance';

    const UPDATED_AT = null;

    protected $fillable = [
        'institutional_event_id',
        'participant_type',
        'participant_id',
        'status_id',
        'attendance_method',
        'verified_by_terminal_id',
        'timestamp',
        'venue_id',
        'sync_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    // references remote students.id or staff.id

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function status()
    {
        return $this->belongsTo(AttendanceStatusType::class, 'status_id');
    }

    public function verifiedByTerminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'verified_by_terminal_id');
    }

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }
}
