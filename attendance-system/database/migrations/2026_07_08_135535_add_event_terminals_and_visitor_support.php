<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_event_terminals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institutional_event_id')->constrained('attendance_institutional_events')->cascadeOnDelete();
            $table->foreignId('terminal_id')->constrained('attendance_terminals')->cascadeOnDelete();
            $table->unique(['institutional_event_id', 'terminal_id'], 'evt_term_uniq');
            $table->timestamps();
        });

        Schema::table('attendance_event_attendance', function (Blueprint $table) {
            $table->boolean('is_visitor')->default(false)->after('clock_type');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_event_attendance', function (Blueprint $table) {
            $table->dropColumn('is_visitor');
        });
        Schema::dropIfExists('attendance_event_terminals');
    }
};
