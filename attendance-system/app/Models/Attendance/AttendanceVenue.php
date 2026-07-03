<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceVenue extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_venues';

    protected $fillable = [
        'lecture_venue_id',
        'name',
        'code',
        'description',
        'venue_type',
        'faculty_id',
        'department_id',
        'capacity',
        'is_active',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    // references remote lecture_venues.id
    // references remote faculties.id
    // references remote departments.id

    public function terminals()
    {
        return $this->hasMany(AttendanceTerminal::class, 'venue_id');
    }

    public function sessions()
    {
        return $this->hasMany(AttendanceSession::class, 'venue_id');
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'venue_id');
    }

    public function staffClockings()
    {
        return $this->hasMany(AttendanceStaffClocking::class, 'venue_id');
    }

    public function institutionalEvents()
    {
        return $this->hasMany(AttendanceInstitutionalEvent::class, 'venue_id');
    }

    public function eventAttendances()
    {
        return $this->hasMany(AttendanceEventAttendance::class, 'venue_id');
    }
}
