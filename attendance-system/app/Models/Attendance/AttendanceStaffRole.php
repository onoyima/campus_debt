<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceStaffRole extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_staff_roles';

    public $timestamps = false;

    protected $fillable = [
        'staff_id',
        'attendance_role_id',
        'assigned_by',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    // references remote staff.id
    // references remote staff.id

    public function role()
    {
        return $this->belongsTo(AttendanceRole::class, 'attendance_role_id');
    }
}
