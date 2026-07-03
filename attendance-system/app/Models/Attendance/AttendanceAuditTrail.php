<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;

class AttendanceAuditTrail extends Model
{
    const UPDATED_AT = null;

    protected $connection = 'mysql';

    protected $table = 'attendance_audit_trail';

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'event',
        'old_values',
        'new_values',
        'user_id',
        'user_type',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
