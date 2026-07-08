<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_event_attendance', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_event_attendance', 'clock_type')) {
                $table->string('clock_type', 20)->nullable()->after('attendance_method');
            }
            if (!Schema::hasColumn('attendance_event_attendance', 'is_clocked_out')) {
                $table->boolean('is_clocked_out')->default(false)->after('clock_type');
            }
            $table->index('clock_type', 'idx_event_attendance_clock_type');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_event_attendance', function (Blueprint $table) {
            $table->dropIndex('idx_event_attendance_clock_type');
            $table->dropColumn(['clock_type', 'is_clocked_out']);
        });
    }
};
