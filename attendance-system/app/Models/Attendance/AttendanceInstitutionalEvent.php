<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceInstitutionalEvent extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_institutional_events';

    protected $fillable = [
        'title',
        'description',
        'event_category_id',
        'event_type',
        'venue_id',
        'organizer_id',
        'organizing_unit_id',
        'organizing_unit_type',
        'academic_session_id',
        'vu_semester_id',
        'start_date',
        'end_date',
        'attendance_open_time',
        'attendance_close_time',
        'clock_in_open_time',
        'clock_out_open_time',
        'clock_out_close_time',
        'grace_period_minutes',
        'is_mandatory',
        'is_active',
        'recurrence_rule',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_mandatory' => 'boolean',
            'is_active' => 'boolean',
            'recurrence_rule' => 'array',
            'metadata' => 'array',
        ];
    }

    // references remote staff.id
    // references remote academic_sessions.id
    // references remote vu_semesters.id

    public function eventCategory()
    {
        return $this->belongsTo(AttendanceEventCategory::class, 'event_category_id');
    }

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }

    public function sessions()
    {
        return $this->hasMany(AttendanceSession::class, 'institutional_event_id');
    }

    public function targetGroups()
    {
        return $this->hasMany(AttendanceEventTargetGroup::class, 'institutional_event_id');
    }

    public function participants()
    {
        return $this->hasMany(AttendanceEventParticipant::class, 'institutional_event_id');
    }

    public function eventAttendances()
    {
        return $this->hasMany(AttendanceEventAttendance::class, 'institutional_event_id');
    }

    public function penaltyAssignments()
    {
        return $this->hasMany(AttendanceEventPenaltyAssignment::class, 'institutional_event_id');
    }

    public function debts()
    {
        return $this->hasMany(AttendanceDebt::class, 'institutional_event_id');
    }

    public function staffCompliances()
    {
        return $this->hasMany(AttendanceStaffCompliance::class, 'institutional_event_id');
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'institutional_event_id');
    }

    public function assignedTerminals()
    {
        return $this->belongsToMany(AttendanceTerminal::class, 'attendance_event_terminals', 'institutional_event_id', 'terminal_id')
            ->withTimestamps();
    }

    public function windows()
    {
        return $this->hasMany(AttendanceEventWindow::class, 'institutional_event_id')->orderBy('window_date');
    }

    public function getActiveTerminalsAttribute()
    {
        $assigned = $this->assignedTerminals()->where('is_active', true)->get();
        if ($assigned->isNotEmpty()) {
            return $assigned;
        }

        return $this->venue?->terminals()->where('is_active', true)->get() ?? collect();
    }
}
