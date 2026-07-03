<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceRecord extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_records';

    protected $fillable = [
        'student_id',
        'session_id',
        'institutional_event_id',
        'status_id',
        'attendance_method',
        'verified_by_terminal_id',
        'verified_by_staff_id',
        'timestamp',
        'venue_id',
        'academic_session_id',
        'vu_semester_id',
        'latitude',
        'longitude',
        'liveness_score',
        'confidence_score',
        'device_id',
        'sync_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'liveness_score' => 'float',
            'confidence_score' => 'float',
            'metadata' => 'array',
        ];
    }

    // references remote students.id
    // references remote staff.id
    // references remote academic_sessions.id
    // references remote vu_semesters.id

    public function session()
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
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

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function excuses()
    {
        return $this->hasMany(AttendanceExcuse::class, 'attendance_record_id');
    }

    public function debts()
    {
        return $this->hasMany(AttendanceDebt::class, 'attendance_record_id');
    }
}
