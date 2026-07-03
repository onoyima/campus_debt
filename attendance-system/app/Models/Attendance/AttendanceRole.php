<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceRole extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_roles';

    const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'permissions',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function staffRoles()
    {
        return $this->hasMany(AttendanceStaffRole::class, 'attendance_role_id');
    }
}
