<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceNotification extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_notifications';

    const UPDATED_AT = null;

    protected $fillable = [
        'recipient_type',
        'recipient_id',
        'notification_type',
        'title',
        'message',
        'data',
        'priority',
        'status',
        'delivery_methods',
        'scheduled_at',
        'sent_at',
        'delivered_at',
        'read_at',
        'retry_count',
        'action_url',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'delivery_methods' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    // references remote students.id or staff.id
}
