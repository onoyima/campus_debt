<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('attendance_status_types')->insert([
            'code' => 'exeat_leave',
            'display_name' => 'Exeat Leave',
            'description' => 'Official exeat leave - student authorized to be away by school',
            'counts_as_present' => true,
            'counts_as_absent' => false,
            'requires_approval' => true,
            'is_system' => true,
            'sort_order' => 9,
        ]);
    }

    public function down(): void
    {
        DB::table('attendance_status_types')->where('code', 'exeat_leave')->delete();
    }
};
