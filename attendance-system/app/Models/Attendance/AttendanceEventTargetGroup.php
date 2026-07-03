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
}
