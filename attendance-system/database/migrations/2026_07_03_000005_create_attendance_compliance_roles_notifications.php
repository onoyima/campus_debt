<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_staff_compliance', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id')->comment('references remote staff.id');
            $table->unsignedBigInteger('institutional_event_id');
            $table->unsignedBigInteger('attendance_status_id')->nullable();
            $table->boolean('reported_to_qa')->default(false);
            $table->boolean('reported_to_bursary')->default(false);
            $table->boolean('reported_to_hr')->default(false);
            $table->boolean('deduction_processed')->default(false);
            $table->decimal('deduction_amount', 10, 2)->nullable();
            $table->string('report_reference', 100)->nullable();
            $table->boolean('qa_approved')->default(false);
            $table->unsignedBigInteger('qa_approved_by')->nullable()->comment('references remote staff.id');
            $table->timestamp('qa_approved_at')->nullable();
            $table->boolean('bursary_processed')->default(false);
            $table->timestamp('bursary_processed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->foreign('institutional_event_id')->references('id')->on('attendance_institutional_events');
            $table->foreign('attendance_status_id')->references('id')->on('attendance_status_types');
            $table->index('staff_id', 'idx_staff_compliance_staff');
            $table->index('institutional_event_id', 'idx_staff_compliance_event');
        });

        Schema::create('attendance_qa_compliance_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_type', 50);
            $table->json('parameters')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable()->comment('references remote staff.id');
            $table->string('file_path', 500)->nullable();
            $table->string('export_format', 20)->nullable();
            $table->timestamp('generated_at')->useCurrent();
        });

        Schema::create('attendance_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('display_name', 150);
            $table->text('description')->nullable();
            $table->json('permissions')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        DB::table('attendance_roles')->insert([
            ['name' => 'event_convener', 'display_name' => 'Event Convener', 'description' => 'Can create, configure, and manage institutional events'],
            ['name' => 'qa_officer', 'display_name' => 'Quality Assurance Officer', 'description' => 'Can monitor compliance, view reports, manage exam hall access'],
            ['name' => 'debt_recovery_officer', 'display_name' => 'Debt Recovery Officer', 'description' => 'Can view debts, verify payments, approve clearance'],
            ['name' => 'bursary_officer', 'display_name' => 'Bursary Officer', 'description' => 'Can access attendance-related financial reports and deductions'],
            ['name' => 'examination_officer', 'display_name' => 'Examination Officer', 'description' => 'Can manage exam eligibility and clearance'],
            ['name' => 'security_personnel', 'display_name' => 'Security Personnel', 'description' => 'Can verify students at examination halls and gates'],
            ['name' => 'student_affairs', 'display_name' => 'Student Affairs Officer', 'description' => 'Can manage student attendance complaints and exceptions'],
            ['name' => 'system_administrator', 'display_name' => 'System Administrator', 'description' => 'Full system access, role management, penalty schedule'],
        ]);

        Schema::create('attendance_staff_roles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id')->comment('references remote staff.id');
            $table->unsignedBigInteger('attendance_role_id');
            $table->unsignedBigInteger('assigned_by')->nullable()->comment('references remote staff.id');
            $table->timestamp('assigned_at')->useCurrent();
            $table->unique(['staff_id', 'attendance_role_id'], 'uq_staff_role');
            $table->foreign('attendance_role_id')->references('id')->on('attendance_roles');
            $table->index('staff_id', 'idx_staff_roles_staff');
        });

        Schema::create('attendance_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('recipient_type', 20);
            $table->unsignedBigInteger('recipient_id')->comment('references remote students.id or staff.id');
            $table->string('notification_type', 50);
            $table->string('title', 255);
            $table->text('message');
            $table->json('data')->nullable();
            $table->string('priority', 20)->default('medium');
            $table->string('status', 50)->default('pending');
            $table->json('delivery_methods')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->integer('retry_count')->default(0);
            $table->string('action_url', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['recipient_type', 'recipient_id'], 'idx_notifications_recipient');
            $table->index('status', 'idx_notifications_status');
            $table->index('notification_type', 'idx_notifications_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_notifications');
        Schema::dropIfExists('attendance_staff_roles');
        Schema::dropIfExists('attendance_roles');
        Schema::dropIfExists('attendance_qa_compliance_reports');
        Schema::dropIfExists('attendance_staff_compliance');
    }
};
