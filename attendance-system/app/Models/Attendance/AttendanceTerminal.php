<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceTerminal extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_terminals';

    protected $fillable = [
        'venue_id',
        'device_id',
        'device_certificate',
        'terminal_type',
        'os',
        'firmware_version',
        'is_active',
        'last_sync_at',
        'last_poll_at',
        'public_key',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_sync_at' => 'datetime',
            'last_poll_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }

    public function venueTerminalLogs()
    {
        return $this->hasMany(AttendanceVenueTerminalLog::class, 'terminal_id');
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'verified_by_terminal_id');
    }

    public function staffClockings()
    {
        return $this->hasMany(AttendanceStaffClocking::class, 'verified_by_terminal_id');
    }

    public function biometricTemplates()
    {
        return $this->hasMany(AttendanceBiometricTemplate::class, 'enrolled_terminal_id');
    }

    public function biometricVerificationLogs()
    {
        return $this->hasMany(AttendanceBiometricVerificationLog::class, 'terminal_id');
    }

    public function offlinePendingSyncs()
    {
        return $this->hasMany(AttendanceOfflinePendingSync::class, 'terminal_id');
    }

    public function eventAttendances()
    {
        return $this->hasMany(AttendanceEventAttendance::class, 'verified_by_terminal_id');
    }
}
