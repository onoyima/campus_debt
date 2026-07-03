<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceQaComplianceReport extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_qa_compliance_reports';

    public $timestamps = false;

    protected $fillable = [
        'report_type',
        'parameters',
        'generated_by',
        'file_path',
        'export_format',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'parameters' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    // references remote staff.id
}
