<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceExamEligibilityLog extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_exam_eligibility_logs';

    const UPDATED_AT = null;

    protected $fillable = [
        'student_id',
        'course_id',
        'previous_status_id',
        'new_status_id',
        'changed_by',
        'change_reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    // references remote students.id
    // references remote courses.id
    // references remote staff.id

    public function previousStatus()
    {
        return $this->belongsTo(AttendanceExamEligibilityStatus::class, 'previous_status_id');
    }

    public function newStatus()
    {
        return $this->belongsTo(AttendanceExamEligibilityStatus::class, 'new_status_id');
    }
}
