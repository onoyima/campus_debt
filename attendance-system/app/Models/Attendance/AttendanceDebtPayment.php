<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceDebtPayment extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_debt_payments';

    const UPDATED_AT = null;

    protected $fillable = [
        'attendance_debt_id',
        'amount',
        'payment_reference',
        'payment_method',
        'payment_date',
        'verified_by',
        'verified_at',
        'receipt_url',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'datetime',
            'verified_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    // references remote staff.id

    public function debt()
    {
        return $this->belongsTo(AttendanceDebt::class, 'attendance_debt_id');
    }
}
