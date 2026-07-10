<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_penalty_schedule', function (Blueprint $table) {
            $table->decimal('student_amount', 10, 2)->default(0.00)->after('amount');
            $table->decimal('staff_amount', 10, 2)->default(0.00)->after('student_amount');
        });

        Schema::table('attendance_debts', function (Blueprint $table) {
            $table->unsignedBigInteger('staff_id')->nullable()->after('student_id')->comment('references remote staff.id');
            $table->string('participant_type', 20)->nullable()->after('staff_id')->comment('student or staff');
            $table->index('staff_id', 'idx_debts_staff');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_debts', function (Blueprint $table) {
            $table->dropIndex('idx_debts_staff');
            $table->dropColumn(['staff_id', 'participant_type']);
        });

        Schema::table('attendance_penalty_schedule', function (Blueprint $table) {
            $table->dropColumn(['student_amount', 'staff_amount']);
        });
    }
};
