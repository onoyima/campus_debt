<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Student;
use App\Models\StudentExeatDebt;

class PaymentReceipt extends Model
{
    use HasFactory;

    protected $table = 'exeat_payment_receipts';

    protected $fillable = [
        'student_id',
        'student_exeat_debt_id',
        'transaction_reference',
        'amount',
        'currency',
        'channel',
        'paid_at',
        'receipt_number',
        'metadata',
        'status'
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function debt()
    {
        return $this->belongsTo(StudentExeatDebt::class, 'student_exeat_debt_id');
    }
}
