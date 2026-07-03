<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceStatusType extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_status_types';

    const UPDATED_AT = null;

    protected $fillable = [
        'code',
        'display_name',
        'description',
        'counts_as_present',
        'counts_as_absent',
        'requires_approval',
        'is_system',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'counts_as_present' => 'boolean',
            'counts_as_absent' => 'boolean',
            'requires_approval' => 'boolean',
            'is_system' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'status_id');
    }

    public function staffClockings()
    {
        return $this->hasMany(AttendanceStaffClocking::class, 'status_id');
    }

    public function eventAttendances()
    {
        return $this->hasMany(AttendanceEventAttendance::class, 'status_id');
    }

    public function staffCompliances()
    {
        return $this->hasMany(AttendanceStaffCompliance::class, 'attendance_status_id');
    }
}
