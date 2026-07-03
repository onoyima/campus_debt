<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceSyncConflictLog extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_sync_conflict_log';

    public $timestamps = false;

    protected $fillable = [
        'sync_id',
        'resolution_strategy',
        'device_payload',
        'server_payload',
        'resolved_payload',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'device_payload' => 'array',
            'server_payload' => 'array',
            'resolved_payload' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function sync()
    {
        return $this->belongsTo(AttendanceOfflinePendingSync::class, 'sync_id');
    }
}
