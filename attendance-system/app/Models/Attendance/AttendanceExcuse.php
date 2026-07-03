<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceExcuse extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_excuses';

    protected $fillable = [
        'student_id',
        'attendance_record_id',
        'session_id',
        'institutional_event_id',
        'excuse_type',
        'reason',
        'document_path',
        'approved_by',
        'approved_at',
        'status',
        'reviewed_by',
        'review_comment',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    // references remote students.id
    // references remote staff.id
    // references remote staff.id

    public function attendanceRecord()
    {
        return $this->belongsTo(AttendanceRecord::class, 'attendance_record_id');
    }

    public function session()
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }
}
