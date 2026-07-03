<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceStudentDebtLedger extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_student_debt_ledger';

    protected $fillable = [
        'student_id',
        'academic_session_id',
        'vu_semester_id',
        'total_outstanding',
        'total_paid',
        'total_cleared',
        'total_overdue',
        'last_calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'last_calculated_at' => 'datetime',
        ];
    }

    // references remote students.id
    // references remote academic_sessions.id
    // references remote vu_semesters.id
}
