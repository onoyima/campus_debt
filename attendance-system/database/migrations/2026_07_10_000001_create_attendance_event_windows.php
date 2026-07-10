<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_event_windows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institutional_event_id');
            $table->date('window_date');
            $table->time('attendance_open_time');
            $table->time('attendance_close_time');
            $table->integer('grace_period_minutes')->default(0);
            $table->time('clock_out_open_time')->nullable()->comment('Optional');
            $table->time('clock_out_close_time')->nullable()->comment('Optional');
            $table->string('status', 50)->default('scheduled')->comment('scheduled, active, closed');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events')->onDelete('cascade');
            $table->unique(['institutional_event_id', 'window_date'], 'uq_event_window_date');
            $table->index('institutional_event_id', 'idx_event_windows_event');
            $table->index('window_date', 'idx_event_windows_date');
            $table->index('status', 'idx_event_windows_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_event_windows');
    }
};
