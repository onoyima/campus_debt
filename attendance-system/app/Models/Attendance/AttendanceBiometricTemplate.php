<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceBiometricTemplate extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_biometric_templates';

    const CREATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_type',
        'template_type',
        'encrypted_template',
        'template_hash',
        'algorithm_version',
        'is_active',
        'enrolled_at',
        'enrolled_by',
        'enrolled_terminal_id',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'enrolled_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    // references remote students.id or staff.id
    // references remote staff.id

    public function enrolledTerminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'enrolled_terminal_id');
    }

    public function verificationLogs()
    {
        return $this->hasMany(AttendanceBiometricVerificationLog::class, 'template_id');
    }
}
