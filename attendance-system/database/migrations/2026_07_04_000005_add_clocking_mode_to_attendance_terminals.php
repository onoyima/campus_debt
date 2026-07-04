<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_terminals', function (Blueprint $table) {
            $table->string('clocking_mode', 30)->default('any')->after('terminal_type')
                ->comment('any, class_only, staff_only, event_only');
            $table->boolean('allow_any_venue')->default(false)->after('clocking_mode')
                ->comment('If true, class_dedicated terminals can clock sessions at any venue');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_terminals', function (Blueprint $table) {
            $table->dropColumn(['clocking_mode', 'allow_any_venue']);
        });
    }
};
