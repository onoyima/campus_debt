<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('course_assigned_id')->nullable()->comment('references remote course_assigneds.id');
            $table->unsignedBigInteger('institutional_event_id')->nullable()->comment('references local attendance_institutional_events.id');
            $table->unsignedBigInteger('staff_id')->comment('references remote staff.id');
            $table->string('session_type', 50);
            $table->string('title', 255)->nullable();
            $table->date('session_date');
            $table->dateTime('opens_at');
            $table->dateTime('closes_at');
            $table->dateTime('grace_period_end')->nullable();
            $table->string('status', 50)->default('scheduled');
            $table->unsignedBigInteger('venue_id')->nullable();
            $table->json('attendance_methods')->nullable();
            $table->integer('max_participants')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('venue_id')->references('id')->on('attendance_venues');
            $table->index('session_date', 'idx_sessions_date');
            $table->index('session_type', 'idx_sessions_type');
            $table->index('status', 'idx_sessions_status');
            $table->index('course_assigned_id', 'idx_sessions_course');
            $table->index('institutional_event_id', 'idx_sessions_event');
            $table->index('staff_id', 'idx_sessions_staff');
            $table->index('venue_id', 'idx_sessions_venue');
        });

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('session_id')->nullable();
            $table->unsignedBigInteger('institutional_event_id')->nullable()->comment('references local attendance_institutional_events.id');
            $table->unsignedBigInteger('status_id');
            $table->string('attendance_method', 50);
            $table->unsignedBigInteger('verified_by_terminal_id')->nullable();
            $table->unsignedBigInteger('verified_by_staff_id')->nullable()->comment('references remote staff.id');
            $table->dateTime('timestamp');
            $table->unsignedBigInteger('venue_id')->nullable();
            $table->unsignedBigInteger('academic_session_id')->nullable()->comment('references remote academic_sessions.id');
            $table->unsignedBigInteger('vu_semester_id')->nullable()->comment('references remote vu_semesters.id');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('liveness_score', 5, 2)->nullable();
            $table->decimal('confidence_score', 5, 2)->nullable();
            $table->string('device_id', 100)->nullable();
            $table->string('sync_status', 50)->default('synced');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('status_id')->references('id')->on('attendance_status_types');
            $table->foreign('session_id')->references('id')->on('attendance_sessions');
            $table->foreign('verified_by_terminal_id')->references('id')->on('attendance_terminals');
            $table->foreign('venue_id')->references('id')->on('attendance_venues');
            $table->index('student_id', 'idx_records_student');
            $table->index('session_id', 'idx_records_session');
            $table->index('institutional_event_id', 'idx_records_event');
            $table->index('timestamp', 'idx_records_timestamp');
            $table->index('status_id', 'idx_records_status');
            $table->index('sync_status', 'idx_records_sync');
        });

        Schema::create('attendance_excuses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('attendance_record_id')->nullable();
            $table->unsignedBigInteger('session_id')->nullable();
            $table->unsignedBigInteger('institutional_event_id')->nullable()->comment('references local attendance_institutional_events.id');
            $table->string('excuse_type', 50);
            $table->text('reason');
            $table->string('document_path', 500)->nullable();
            $table->unsignedBigInteger('approved_by')->comment('references remote staff.id');
            $table->timestamp('approved_at')->nullable();
            $table->string('status', 50)->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable()->comment('references remote staff.id');
            $table->text('review_comment')->nullable();
            $table->timestamps();
            $table->foreign('attendance_record_id')->references('id')->on('attendance_records');
            $table->foreign('session_id')->references('id')->on('attendance_sessions');
            $table->index('student_id', 'idx_excuses_student');
            $table->index('status', 'idx_excuses_status');
        });

        Schema::create('attendance_staff_clocking', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id')->comment('references remote staff.id');
            $table->string('clock_type', 50);
            $table->dateTime('timestamp');
            $table->unsignedBigInteger('venue_id')->nullable();
            $table->unsignedBigInteger('verified_by_terminal_id')->nullable();
            $table->string('attendance_method', 50);
            $table->unsignedBigInteger('status_id');
            $table->string('sync_status', 50)->default('synced');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('venue_id', 'fk_staff_clock_venue')->references('id')->on('attendance_venues');
            $table->foreign('verified_by_terminal_id', 'fk_staff_clock_terminal')->references('id')->on('attendance_terminals');
            $table->foreign('status_id', 'fk_staff_clock_status')->references('id')->on('attendance_status_types');
            $table->index('staff_id', 'idx_staff_clocking_staff');
            $table->index('timestamp', 'idx_staff_clocking_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_staff_clocking');
        Schema::dropIfExists('attendance_excuses');
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_sessions');
    }
};
