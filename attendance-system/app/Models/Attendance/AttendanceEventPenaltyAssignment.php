<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceEventPenaltyAssignment extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_event_penalty_assignments';

    const UPDATED_AT = null;

    protected $fillable = [
        'institutional_event_id',
        'penalty_id',
        'applies_to',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function penalty()
    {
        return $this->belongsTo(AttendancePenaltySchedule::class, 'penalty_id');
    }
}
