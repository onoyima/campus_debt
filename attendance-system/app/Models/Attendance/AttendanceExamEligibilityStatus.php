<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceExamEligibilityStatus extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_exam_eligibility_statuses';

    public $timestamps = false;

    protected $fillable = [
        'code',
        'display_name',
        'description',
        'is_eligible',
    ];

    protected function casts(): array
    {
        return [
            'is_eligible' => 'boolean',
        ];
    }

    public function eligibilities()
    {
        return $this->hasMany(AttendanceExamEligibility::class, 'eligibility_status_id');
    }

    public function eligibilityLogsAsPrevious()
    {
        return $this->hasMany(AttendanceExamEligibilityLog::class, 'previous_status_id');
    }

    public function eligibilityLogsAsNew()
    {
        return $this->hasMany(AttendanceExamEligibilityLog::class, 'new_status_id');
    }
}
