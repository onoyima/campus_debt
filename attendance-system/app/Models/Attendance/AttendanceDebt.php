<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceDebt extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_debts';

    protected $fillable = [
        'student_id',
        'institutional_event_id',
        'attendance_record_id',
        'penalty_id',
        'amount',
        'reason',
        'due_date',
        'payment_status',
        'clearance_status',
        'blocks_eligibility',
        'cleared_by',
        'cleared_at',
        'waiver_reason',
        'waiver_approved_by',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'cleared_at' => 'datetime',
            'blocks_eligibility' => 'boolean',
            'metadata' => 'array',
        ];
    }

    // references remote students.id
    // references remote staff.id
    // references remote staff.id

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function attendanceRecord()
    {
        return $this->belongsTo(AttendanceRecord::class, 'attendance_record_id');
    }

    public function penalty()
    {
        return $this->belongsTo(AttendancePenaltySchedule::class, 'penalty_id');
    }

    public function debtPayments()
    {
        return $this->hasMany(AttendanceDebtPayment::class, 'attendance_debt_id');
    }
}
