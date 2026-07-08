<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceDeviceCommand extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_device_commands';

    protected $fillable = [
        'terminal_id',
        'command',
        'payload',
        'status',
        'result',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'result' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function terminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'terminal_id');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'failed']);
    }

    public function scopeByTerminal($query, int $terminalId)
    {
        return $query->where('terminal_id', $terminalId);
    }
}
