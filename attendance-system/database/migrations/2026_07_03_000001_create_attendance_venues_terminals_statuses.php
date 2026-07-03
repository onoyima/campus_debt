<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_venues', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lecture_venue_id')->nullable()->comment('references remote lecture_venues.id');
            $table->string('name', 255);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->string('venue_type', 50);
            $table->unsignedBigInteger('faculty_id')->nullable()->comment('references remote faculties.id');
            $table->unsignedBigInteger('department_id')->nullable()->comment('references remote departments.id');
            $table->integer('capacity')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index('faculty_id', 'idx_venues_faculty');
            $table->index('department_id', 'idx_venues_dept');
        });

        Schema::create('attendance_terminals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('venue_id');
            $table->string('device_id', 100)->unique();
            $table->text('device_certificate');
            $table->string('terminal_type', 50)->default('dedicated');
            $table->string('os', 50)->nullable();
            $table->string('firmware_version', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamp('last_poll_at')->nullable();
            $table->text('public_key')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('attendance_venues')->onDelete('cascade');
        });

        Schema::create('attendance_venue_terminal_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('terminal_id');
            $table->string('event', 100);
            $table->string('ip_address', 45)->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('terminal_id')->references('id')->on('attendance_terminals');
            $table->index('terminal_id', 'idx_terminal_logs_terminal');
            $table->index('created_at', 'idx_terminal_logs_created');
        });

        Schema::create('attendance_status_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('display_name', 100);
            $table->text('description')->nullable();
            $table->boolean('counts_as_present')->default(false);
            $table->boolean('counts_as_absent')->default(false);
            $table->boolean('requires_approval')->default(false);
            $table->boolean('is_system')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        DB::table('attendance_status_types')->insert([
            ['code' => 'present', 'display_name' => 'Present', 'description' => 'Student was present and verified', 'counts_as_present' => true, 'counts_as_absent' => false, 'requires_approval' => false, 'sort_order' => 1],
            ['code' => 'late', 'display_name' => 'Late', 'description' => 'Student arrived after the grace period', 'counts_as_present' => true, 'counts_as_absent' => false, 'requires_approval' => false, 'sort_order' => 2],
            ['code' => 'absent', 'display_name' => 'Absent', 'description' => 'Student did not attend', 'counts_as_present' => false, 'counts_as_absent' => true, 'requires_approval' => false, 'sort_order' => 3],
            ['code' => 'excused', 'display_name' => 'Excused', 'description' => 'Absence approved by authorized personnel', 'counts_as_present' => false, 'counts_as_absent' => false, 'requires_approval' => true, 'sort_order' => 4],
            ['code' => 'proxy', 'display_name' => 'Proxy', 'description' => 'Attendance recorded by authorized proxy', 'counts_as_present' => true, 'counts_as_absent' => false, 'requires_approval' => true, 'sort_order' => 5],
            ['code' => 'exam_leave', 'display_name' => 'Examination Leave', 'description' => 'Official examination leave - does not affect percentage', 'counts_as_present' => false, 'counts_as_absent' => false, 'requires_approval' => true, 'sort_order' => 6],
            ['code' => 'official_assignment', 'display_name' => 'Official Assignment', 'description' => 'Student on official institutional duty', 'counts_as_present' => false, 'counts_as_absent' => false, 'requires_approval' => true, 'sort_order' => 7],
            ['code' => 'medical_leave', 'display_name' => 'Medical Leave', 'description' => 'Student on approved medical leave', 'counts_as_present' => false, 'counts_as_absent' => false, 'requires_approval' => true, 'sort_order' => 8],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_status_types');
        Schema::dropIfExists('attendance_venue_terminal_logs');
        Schema::dropIfExists('attendance_terminals');
        Schema::dropIfExists('attendance_venues');
    }
};
