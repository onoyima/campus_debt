<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_device_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('terminal_id')->constrained('attendance_terminals')->cascadeOnDelete();
            $table->string('command', 100);
            $table->text('payload')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->text('result')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_device_commands');
    }
};
