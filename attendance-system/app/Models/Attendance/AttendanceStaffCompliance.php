<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceStaffCompliance extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_staff_compliance';

    protected $fillable = [
        'staff_id',
        'institutional_event_id',
        'attendance_status_id',
        'reported_to_qa',
        'reported_to_bursary',
        'reported_to_hr',
        'deduction_processed',
        'deduction_amount',
        'report_reference',
        'qa_approved',
        'qa_approved_by',
        'qa_approved_at',
        'bursary_processed',
        'bursary_processed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'reported_to_qa' => 'boolean',
            'reported_to_bursary' => 'boolean',
            'reported_to_hr' => 'boolean',
            'deduction_processed' => 'boolean',
            'qa_approved' => 'boolean',
            'bursary_processed' => 'boolean',
            'qa_approved_at' => 'datetime',
            'bursary_processed_at' => 'datetime',
        ];
    }

    // references remote staff.id
    // references remote staff.id

    public function institutionalEvent()
    {
        return $this->belongsTo(AttendanceInstitutionalEvent::class, 'institutional_event_id');
    }

    public function attendanceStatus()
    {
        return $this->belongsTo(AttendanceStatusType::class, 'attendance_status_id');
    }
}
