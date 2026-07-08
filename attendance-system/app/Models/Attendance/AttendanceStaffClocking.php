<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceStaffClocking extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_staff_clocking';

    const UPDATED_AT = null;

    protected $fillable = [
        'staff_id',
        'clock_type',
        'timestamp',
        'venue_id',
        'verified_by_terminal_id',
        'attendance_method',
        'status_id',
        'sync_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function getClockedAtAttribute($value)
    {
        return $this->timestamp;
    }

    // references remote staff.id

    public function venue()
    {
        return $this->belongsTo(AttendanceVenue::class, 'venue_id');
    }

    public function verifiedByTerminal()
    {
        return $this->belongsTo(AttendanceTerminal::class, 'verified_by_terminal_id');
    }

    public function status()
    {
        return $this->belongsTo(AttendanceStatusType::class, 'status_id');
    }
}
