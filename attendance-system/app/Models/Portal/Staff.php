<?php

namespace App\Models\Portal;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class Staff extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $connection = 'mysql_remote';
    protected $table = 'staff';
    protected $primaryKey = 'id';

    protected $fillable = [
        'title', 'fname', 'mname', 'lname', 'email',
        'maiden_name', 'gender', 'dob', 'country_id', 'state_id',
        'lga_name', 'city', 'marital_status', 'religion',
        'phone', 'address', 'p_email', 'password', 'status',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    public function getAuthPassword()
    {
        return $this->password;
    }
}
