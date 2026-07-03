<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceExamEligibility extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_exam_eligibility';

    protected $fillable = [
        'student_id',
        'course_id',
        'academic_session_id',
        'vu_semester_id',
        'eligibility_status_id',
        'attendance_percentage',
        'required_attendance_percentage',
        'total_classes',
        'attended_classes',
        'school_fees_cleared',
        'attendance_debts_cleared',
        'exeat_debts_cleared',
        'course_registered',
        'reasons_json',
        'last_evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'school_fees_cleared' => 'boolean',
            'attendance_debts_cleared' => 'boolean',
            'exeat_debts_cleared' => 'boolean',
            'course_registered' => 'boolean',
            'reasons_json' => 'array',
            'last_evaluated_at' => 'datetime',
        ];
    }

    // references remote students.id
    // references remote courses.id
    // references remote academic_sessions.id
    // references remote vu_semesters.id

    public function eligibilityStatus()
    {
        return $this->belongsTo(AttendanceExamEligibilityStatus::class, 'eligibility_status_id');
    }
}
