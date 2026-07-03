<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_event_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->string('icon', 50)->nullable();
            $table->string('color', 20)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        DB::table('attendance_event_categories')->insert([
            ['name' => 'academic_lecture', 'description' => 'Scheduled academic class'],
            ['name' => 'chapel_mass', 'description' => 'Institutional worship program'],
            ['name' => 'seminar', 'description' => 'Academic seminar'],
            ['name' => 'workshop', 'description' => 'Academic or professional workshop'],
            ['name' => 'conference', 'description' => 'Academic conference'],
            ['name' => 'staff_meeting', 'description' => 'Staff/departmental/faculty meeting'],
            ['name' => 'senate_meeting', 'description' => 'Senate meeting'],
            ['name' => 'convocation', 'description' => 'Convocation ceremony'],
            ['name' => 'orientation', 'description' => 'Orientation program'],
            ['name' => 'examination_briefing', 'description' => 'Pre-examination briefing'],
            ['name' => 'student_assembly', 'description' => 'Student assembly'],
            ['name' => 'institutional_ceremony', 'description' => 'Other institutional ceremony'],
            ['name' => 'departmental_meeting', 'description' => 'Departmental meeting'],
            ['name' => 'faculty_meeting', 'description' => 'Faculty meeting'],
        ]);

        Schema::create('attendance_institutional_events', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('event_category_id')->nullable();
            $table->string('event_type', 50)->default('one_time');
            $table->unsignedBigInteger('venue_id')->nullable();
            $table->unsignedBigInteger('organizer_id')->comment('references remote staff.id');
            $table->unsignedBigInteger('organizing_unit_id')->nullable();
            $table->string('organizing_unit_type', 50)->nullable();
            $table->unsignedBigInteger('academic_session_id')->nullable()->comment('references remote academic_sessions.id');
            $table->unsignedBigInteger('vu_semester_id')->nullable()->comment('references remote vu_semesters.id');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->time('attendance_open_time');
            $table->time('attendance_close_time');
            $table->integer('grace_period_minutes')->default(0);
            $table->boolean('is_mandatory')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('recurrence_rule')->nullable();
            $table->string('status', 50)->default('draft');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('event_category_id')->references('id')->on('attendance_event_categories');
            $table->foreign('venue_id')->references('id')->on('attendance_venues');
            $table->index('event_category_id', 'idx_events_category');
            $table->index('organizer_id', 'idx_events_organizer');
            $table->index('start_date', 'idx_events_date');
            $table->index('status', 'idx_events_status');
        });

        Schema::create('attendance_event_target_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institutional_event_id');
            $table->string('target_type', 50);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events')->onDelete('cascade');
            $table->index('institutional_event_id', 'idx_target_event');
        });

        Schema::create('attendance_event_participants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institutional_event_id');
            $table->string('participant_type', 20);
            $table->unsignedBigInteger('participant_id')->comment('references remote students.id or staff.id');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['institutional_event_id', 'participant_type', 'participant_id'], 'uq_participant');
            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events')->onDelete('cascade');
            $table->index('institutional_event_id', 'idx_participants_event');
            $table->index('participant_id', 'idx_participants_user');
        });

        Schema::create('attendance_event_attendance', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institutional_event_id');
            $table->string('participant_type', 20);
            $table->unsignedBigInteger('participant_id')->comment('references remote students.id or staff.id');
            $table->unsignedBigInteger('status_id');
            $table->string('attendance_method', 50);
            $table->unsignedBigInteger('verified_by_terminal_id')->nullable();
            $table->dateTime('timestamp');
            $table->unsignedBigInteger('venue_id')->nullable();
            $table->string('sync_status', 50)->default('synced');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events');
            $table->foreign('status_id')->references('id')->on('attendance_status_types');
            $table->foreign('verified_by_terminal_id')->references('id')->on('attendance_terminals');
            $table->foreign('venue_id')->references('id')->on('attendance_venues');
            $table->index('institutional_event_id', 'idx_event_attendance_event');
            $table->index('participant_id', 'idx_event_attendance_user');
        });

        Schema::create('attendance_penalty_schedule', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('penalty_type', 50)->default('fixed');
            $table->decimal('amount', 10, 2)->default(0.00);
            $table->string('applicable_to', 20)->default('student');
            $table->boolean('applies_to_late')->default(false);
            $table->boolean('applies_to_absence')->default(true);
            $table->decimal('max_cumulative_amount', 10, 2)->nullable();
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable()->comment('references remote staff.id');
            $table->timestamps();
        });

        Schema::create('attendance_event_penalty_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institutional_event_id');
            $table->unsignedBigInteger('penalty_id');
            $table->string('applies_to', 20)->default('absence');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['institutional_event_id', 'penalty_id', 'applies_to'], 'uq_event_penalty');
            $table->foreign('institutional_event_id', 'fk_penalty_assign_event')->references('id')->on('attendance_institutional_events')->onDelete('cascade');
            $table->foreign('penalty_id', 'fk_penalty_assign_penalty')->references('id')->on('attendance_penalty_schedule');
        });

        Schema::create('attendance_debts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('institutional_event_id')->nullable();
            $table->unsignedBigInteger('attendance_record_id')->nullable();
            $table->unsignedBigInteger('penalty_id')->nullable();
            $table->decimal('amount', 10, 2);
            $table->text('reason');
            $table->date('due_date');
            $table->string('payment_status', 50)->default('unpaid');
            $table->string('clearance_status', 50)->default('pending');
            $table->unsignedBigInteger('cleared_by')->nullable()->comment('references remote staff.id');
            $table->timestamp('cleared_at')->nullable();
            $table->text('waiver_reason')->nullable();
            $table->unsignedBigInteger('waiver_approved_by')->nullable()->comment('references remote staff.id');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events');
            $table->foreign('attendance_record_id')->references('id')->on('attendance_records');
            $table->foreign('penalty_id')->references('id')->on('attendance_penalty_schedule');
            $table->index('student_id', 'idx_debts_student');
            $table->index('payment_status', 'idx_debts_status');
            $table->index(['student_id', 'payment_status'], 'idx_debts_student_status');
        });

        Schema::create('attendance_debt_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attendance_debt_id');
            $table->decimal('amount', 10, 2);
            $table->string('payment_reference', 255)->nullable();
            $table->string('payment_method', 50)->nullable();
            $table->timestamp('payment_date')->useCurrent();
            $table->unsignedBigInteger('verified_by')->nullable()->comment('references remote staff.id');
            $table->timestamp('verified_at')->nullable();
            $table->string('receipt_url', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('attendance_debt_id')->references('id')->on('attendance_debts');
        });

        Schema::create('attendance_student_debt_ledger', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('academic_session_id')->nullable()->comment('references remote academic_sessions.id');
            $table->unsignedBigInteger('vu_semester_id')->nullable()->comment('references remote vu_semesters.id');
            $table->decimal('total_outstanding', 10, 2)->default(0.00);
            $table->decimal('total_paid', 10, 2)->default(0.00);
            $table->decimal('total_cleared', 10, 2)->default(0.00);
            $table->decimal('total_overdue', 10, 2)->default(0.00);
            $table->timestamp('last_calculated_at')->useCurrent();
            $table->timestamps();
            $table->unique(['student_id', 'academic_session_id', 'vu_semester_id'], 'uq_student_ledger');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_student_debt_ledger');
        Schema::dropIfExists('attendance_debt_payments');
        Schema::dropIfExists('attendance_debts');
        Schema::dropIfExists('attendance_event_penalty_assignments');
        Schema::dropIfExists('attendance_penalty_schedule');
        Schema::dropIfExists('attendance_event_attendance');
        Schema::dropIfExists('attendance_event_participants');
        Schema::dropIfExists('attendance_event_target_groups');
        Schema::dropIfExists('attendance_institutional_events');
        Schema::dropIfExists('attendance_event_categories');
    }
};
