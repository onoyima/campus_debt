<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    protected $fillable = [
        'staff_id',
        'student_id',
        'action',
        'target_type',
        'target_id',
        'details',
        'timestamp'
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::creating(function ($model) {
            $user = request()->user();
            // Block logging if the user is Engineering staff AND the request comes from the Engineering page
            if ($user && in_array($user->id, [506, 596, 577])) {
                $referer = request()->header('Referer');
                if ($referer && str_contains((string) $referer, '/staff/engineering')) {
                    return false; // Prevent log from being created
                }
            }
        });
    }

    public function exeatRequest()
    {
        return $this->belongsTo(ExeatRequest::class, 'target_id')->where('target_type', 'exeat_request');
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
