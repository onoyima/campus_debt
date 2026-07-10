<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendancePenaltySchedule extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_penalty_schedule';

    protected $fillable = [
        'name',
        'description',
        'penalty_type',
        'amount',
        'student_amount',
        'staff_amount',
        'applicable_to',
        'applies_to_late',
        'applies_to_absence',
        'max_cumulative_amount',
        'effective_date',
        'expiry_date',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'applies_to_late' => 'boolean',
            'applies_to_absence' => 'boolean',
            'is_active' => 'boolean',
            'effective_date' => 'date',
            'expiry_date' => 'date',
        ];
    }

    public function getAmountForType(string $participantType): float
    {
        return match ($participantType) {
            'student' => (float) ($this->student_amount ?: $this->amount),
            'staff' => (float) ($this->staff_amount ?: $this->amount),
            default => (float) $this->amount,
        };
    }

    // references remote staff.id

    public function penaltyAssignments()
    {
        return $this->hasMany(AttendanceEventPenaltyAssignment::class, 'penalty_id');
    }

    public function debts()
    {
        return $this->hasMany(AttendanceDebt::class, 'penalty_id');
    }
}
