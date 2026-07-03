<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceOfflinePendingSync extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_offline_pending_sync';

    const UPDATED_AT = 'synced_at';

    protected $fillable = [
        'terminal_id',
        'table_name',
        'record_id',
        'action',
        'payload',
        'device_timestamp',
        'server_timestamp',
        'conflict_resolution',
        'status',
        'error_message',
        'retry_count',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'device_timestamp' => 'datetime',
            'server_timestamp' => 'datetime',
            'synced_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function terminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'terminal_id');
    }

    public function conflictLogs()
    {
        return $this->hasMany(AttendanceSyncConflictLog::class, 'sync_id');
    }
}
