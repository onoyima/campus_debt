<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceBiometricVerificationLog extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_biometric_verification_logs';

    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_type',
        'method',
        'template_id',
        'terminal_id',
        'result',
        'confidence_score',
        'liveness_score',
        'error_message',
        'duration_ms',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    // references remote students.id or staff.id

    public function template()
    {
        return $this->belongsTo(AttendanceBiometricTemplate::class, 'template_id');
    }

    public function terminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'terminal_id');
    }
}
