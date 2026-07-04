<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_event_target_groups', function (Blueprint $table) {
            $table->string('schedule_day', 10)->nullable()->after('target_id')
                  ->comment('Day of week: mon, tue, wed, thu, fri, sat, sun');
            $table->time('schedule_time')->nullable()->after('schedule_day');
            $table->string('schedule_frequency', 20)->default('weekly')->after('schedule_time')
                  ->comment('weekly, daily, monthly, one_time');
            $table->timestamp('schedule_start_date')->nullable()->after('schedule_frequency');
            $table->timestamp('schedule_end_date')->nullable()->after('schedule_start_date');
            $table->boolean('is_recurring')->default(false)->after('schedule_end_date');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_event_target_groups', function (Blueprint $table) {
            $table->dropColumn([
                'schedule_day', 'schedule_time', 'schedule_frequency',
                'schedule_start_date', 'schedule_end_date', 'is_recurring',
            ]);
        });
    }
};
