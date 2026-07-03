<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'attendance_venues',
        'attendance_terminals',
        'attendance_venue_terminal_logs',
        'attendance_status_types',
        'attendance_sessions',
        'attendance_records',
        'attendance_excuses',
        'attendance_staff_clocking',
        'attendance_event_categories',
        'attendance_institutional_events',
        'attendance_event_target_groups',
        'attendance_event_participants',
        'attendance_event_attendance',
        'attendance_penalty_schedule',
        'attendance_event_penalty_assignments',
        'attendance_debts',
        'attendance_debt_payments',
        'attendance_student_debt_ledger',
        'attendance_exam_eligibility_statuses',
        'attendance_exam_eligibility',
        'attendance_exam_eligibility_logs',
        'attendance_biometric_templates',
        'attendance_biometric_verification_logs',
        'attendance_offline_pending_sync',
        'attendance_sync_conflict_log',
        'attendance_staff_compliance',
        'attendance_qa_compliance_reports',
        'attendance_roles',
        'attendance_staff_roles',
        'attendance_notifications',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->softDeletes();
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropSoftDeletes();
                });
            }
        }
    }
};
