<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceVenueTerminalLog extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_venue_terminal_logs';

    const UPDATED_AT = null;

    protected $fillable = [
        'terminal_id',
        'event',
        'ip_address',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function terminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'terminal_id');
    }
}
