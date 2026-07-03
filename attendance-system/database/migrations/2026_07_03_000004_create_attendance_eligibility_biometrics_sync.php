<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_exam_eligibility_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('display_name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_eligible')->default(false);
        });

        DB::table('attendance_exam_eligibility_statuses')->insert([
            ['code' => 'qualified', 'display_name' => 'Qualified', 'description' => 'All requirements satisfied', 'is_eligible' => true],
            ['code' => 'pending_clearance', 'display_name' => 'Pending Clearance', 'description' => 'Minor requirements pending', 'is_eligible' => false],
            ['code' => 'attendance_deficiency', 'display_name' => 'Attendance Deficiency', 'description' => 'Below minimum attendance threshold', 'is_eligible' => false],
            ['code' => 'outstanding_debt', 'display_name' => 'Outstanding Financial Obligations', 'description' => 'Unpaid fees or penalties', 'is_eligible' => false],
            ['code' => 'not_eligible', 'display_name' => 'Not Eligible', 'description' => 'Multiple requirements not met', 'is_eligible' => false],
        ]);

        Schema::create('attendance_exam_eligibility', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('course_id')->comment('references remote courses.id');
            $table->unsignedBigInteger('academic_session_id')->comment('references remote academic_sessions.id');
            $table->unsignedBigInteger('vu_semester_id')->comment('references remote vu_semesters.id');
            $table->unsignedBigInteger('eligibility_status_id');
            $table->decimal('attendance_percentage', 5, 2)->default(0.00);
            $table->decimal('required_attendance_percentage', 5, 2)->default(80.00);
            $table->integer('total_classes')->default(0);
            $table->integer('attended_classes')->default(0);
            $table->boolean('school_fees_cleared')->default(false);
            $table->boolean('attendance_debts_cleared')->default(false);
            $table->boolean('exeat_debts_cleared')->default(false);
            $table->boolean('course_registered')->default(false);
            $table->json('reasons_json')->nullable();
            $table->timestamp('last_evaluated_at')->useCurrent();
            $table->timestamps();
            $table->unique(['student_id', 'course_id', 'academic_session_id', 'vu_semester_id'], 'uq_eligibility');
            $table->foreign('eligibility_status_id')->references('id')->on('attendance_exam_eligibility_statuses');
            $table->index('student_id', 'idx_eligibility_student');
            $table->index('course_id', 'idx_eligibility_course');
            $table->index('eligibility_status_id', 'idx_eligibility_status');
        });

        Schema::create('attendance_exam_eligibility_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->comment('references remote students.id');
            $table->unsignedBigInteger('course_id')->comment('references remote courses.id');
            $table->unsignedBigInteger('previous_status_id')->nullable();
            $table->unsignedBigInteger('new_status_id');
            $table->unsignedBigInteger('changed_by')->nullable()->comment('references remote staff.id');
            $table->text('change_reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('previous_status_id')->references('id')->on('attendance_exam_eligibility_statuses');
            $table->foreign('new_status_id')->references('id')->on('attendance_exam_eligibility_statuses');
        });

        Schema::create('attendance_biometric_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('references remote students.id or staff.id');
            $table->string('user_type', 20);
            $table->string('template_type', 20);
            $table->text('encrypted_template');
            $table->string('template_hash', 64);
            $table->string('algorithm_version', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('enrolled_at')->useCurrent();
            $table->unsignedBigInteger('enrolled_by')->nullable()->comment('references remote staff.id');
            $table->unsignedBigInteger('enrolled_terminal_id')->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->foreign('enrolled_terminal_id')->references('id')->on('attendance_terminals');
            $table->index(['user_id', 'user_type'], 'idx_biometric_user');
            $table->index('template_type', 'idx_biometric_type');
        });

        Schema::create('attendance_biometric_verification_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('references remote students.id or staff.id');
            $table->string('user_type', 20);
            $table->string('method', 20);
            $table->unsignedBigInteger('template_id')->nullable();
            $table->unsignedBigInteger('terminal_id')->nullable();
            $table->string('result', 50);
            $table->decimal('confidence_score', 5, 2)->nullable();
            $table->decimal('liveness_score', 5, 2)->nullable();
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('template_id')->references('id')->on('attendance_biometric_templates');
            $table->foreign('terminal_id')->references('id')->on('attendance_terminals');
            $table->index('user_id', 'idx_biometric_logs_user');
            $table->index('result', 'idx_biometric_logs_result');
        });

        Schema::create('attendance_offline_pending_sync', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('terminal_id');
            $table->string('table_name', 100);
            $table->unsignedBigInteger('record_id')->nullable();
            $table->string('action', 20);
            $table->json('payload');
            $table->dateTime('device_timestamp');
            $table->timestamp('server_timestamp')->nullable();
            $table->string('conflict_resolution', 50)->nullable();
            $table->string('status', 50)->default('pending');
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('synced_at')->nullable();
            $table->foreign('terminal_id')->references('id')->on('attendance_terminals');
            $table->index('status', 'idx_sync_status');
            $table->index(['terminal_id', 'status'], 'idx_sync_terminal');
        });

        Schema::create('attendance_sync_conflict_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sync_id');
            $table->string('resolution_strategy', 50);
            $table->json('device_payload');
            $table->json('server_payload');
            $table->json('resolved_payload');
            $table->string('resolved_by', 50)->default('system');
            $table->timestamp('resolved_at')->useCurrent();
            $table->foreign('sync_id')->references('id')->on('attendance_offline_pending_sync');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sync_conflict_log');
        Schema::dropIfExists('attendance_offline_pending_sync');
        Schema::dropIfExists('attendance_biometric_verification_logs');
        Schema::dropIfExists('attendance_biometric_templates');
        Schema::dropIfExists('attendance_exam_eligibility_logs');
        Schema::dropIfExists('attendance_exam_eligibility');
        Schema::dropIfExists('attendance_exam_eligibility_statuses');
    }
};
