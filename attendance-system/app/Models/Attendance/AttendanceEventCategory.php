<?php

namespace App\Models\Attendance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceEventCategory extends Model
{
    use SoftDeletes;

    protected $connection = 'mysql';

    protected $table = 'attendance_event_categories';

    const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'description',
        'icon',
        'color',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function institutionalEvents()
    {
        return $this->hasMany(AttendanceInstitutionalEvent::class, 'event_category_id');
    }
}
