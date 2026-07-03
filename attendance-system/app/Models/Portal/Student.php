<?php

namespace App\Models\Portal;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class Student extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $connection = 'mysql_remote';
    protected $table = 'students';
    protected $primaryKey = 'id';

    protected $fillable = [
        'user_id', 'user_type', 'student_role_id', 'email', 'password',
        'title_id', 'lname', 'fname', 'mname', 'gender', 'dob',
        'country_id', 'state_id', 'lga_name', 'city', 'religion',
        'marital_status', 'address', 'phone', 'username', 'passport',
        'signature', 'hobbies', 'email_verified_at', 'status',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    public function getAuthPassword()
    {
        return $this->password;
    }

    public function academic()
    {
        return $this->hasOne(\App\Models\Portal\StudentAcademic::class, 'student_id')->latest();
    }

    public function academics()
    {
        return $this->hasMany(\App\Models\Portal\StudentAcademic::class, 'student_id');
    }
}
