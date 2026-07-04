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
        'clocking_mode',
        'allow_any_venue',
        'os',
        'firmware_version',
        'is_active',
        'last_sync_at',
        'last_poll_at',
        'public_key',
        'metadata',
        'ip_address', 'port', 'comm_key', 'push_url', 'api_key',
        'last_heartbeat_at', 'firmware', 'serial_number', 'device_model',
        'user_count', 'fingerprint_count', 'face_count', 'transaction_count',
        'connection_status',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'allow_any_venue' => 'boolean',
            'last_sync_at' => 'datetime',
            'last_poll_at' => 'datetime',
            'metadata' => 'array',
            'port' => 'integer',
            'last_heartbeat_at' => 'datetime',
            'user_count' => 'integer',
            'fingerprint_count' => 'integer',
            'face_count' => 'integer',
            'transaction_count' => 'integer',
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

    public function scopeOnline($query)
    {
        return $query->where('connection_status', 'online');
    }

    public function scopeOffline($query)
    {
        return $query->where('connection_status', 'offline');
    }

    public function scopeByConnectionStatus($query, string $status)
    {
        return $query->where('connection_status', $status);
    }

    public function scopeByDeviceModel($query, string $model)
    {
        return $query->where('device_model', $model);
    }
}
