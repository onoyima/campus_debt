<?php

use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Api\AttendanceRecordController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BiometricTemplateController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DebtController;
use App\Http\Controllers\Api\DebtPaymentController;
use App\Http\Controllers\Api\EligibilityEngineController;
use App\Http\Controllers\Api\EventAttendanceController;
use App\Http\Controllers\Api\EventCategoryController;
use App\Http\Controllers\Api\EventParticipantController;
use App\Http\Controllers\Api\ExamEligibilityController;
use App\Http\Controllers\Api\ExamHallVerificationController;
use App\Http\Controllers\Api\ExeatController;
use App\Http\Controllers\Api\ExeatDebtCheckController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\ExcuseController;
use App\Http\Controllers\Api\InstitutionalEventController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OfflineSyncController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PenaltyScheduleController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StaffClockingController;
use App\Http\Controllers\Api\StaffComplianceController;
use App\Http\Controllers\Api\StaffCourseController;
use App\Http\Controllers\Api\StaffRoleController;
use App\Http\Controllers\Api\GhostResultController;
use App\Http\Controllers\Api\StatusTypeController;
use App\Http\Controllers\Api\StudentDashboardController;
use App\Http\Controllers\Api\AdminPortalRoleController;
use App\Http\Controllers\Api\AdminStaffAssignmentController;
use App\Http\Controllers\Api\StudentDebtLedgerController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\ZKTController;
use App\Http\Controllers\Api\VenueTerminalLogController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('login', function (Request $request) {
    $key = strtolower($request->input('email', $request->input('username', $request->ip())));
    return Limit::perMinute(5)->by($key);
});

RateLimiter::for('api', function (Request $request) {
    $key = $request->user()?->id ?: $request->ip();
    return Limit::perMinute(120)->by($key);
});

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Shared — accessible by both students and staff
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('api.dashboard.stats');
    Route::get('notifications', [NotificationController::class, 'index'])->name('api.notifications.index');
    Route::get('notifications/{id}', [NotificationController::class, 'show'])->name('api.notifications.show');
    Route::post('notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('api.notifications.mark-read');
    Route::get('status-types', [StatusTypeController::class, 'index'])->name('api.status-types.index');

    // ─────────────────────────────────────────────
    // STUDENT-ONLY — guarded by student.access
    // Students can only see/act on their own data
    // ─────────────────────────────────────────────
    Route::middleware('student.access')->group(function () {
        Route::get('student-dashboard/overview', [StudentDashboardController::class, 'overview'])->name('api.student-dashboard.overview');
        Route::get('student/my-debts', [StudentDashboardController::class, 'myDebts'])->name('api.student.my-debts');
        Route::get('student/my-attendance', [StudentDashboardController::class, 'myAttendanceRecords'])->name('api.student.my-attendance');
        Route::post('attendance-records', [AttendanceRecordController::class, 'store'])->name('api.attendance-records.store');
        Route::apiResource('excuses', ExcuseController::class)->names('api.excuses');
        Route::post('exeats', [ExeatController::class, 'store'])->name('api.exeats.store');
        Route::get('exeats', [ExeatController::class, 'index'])->name('api.exeats.index');
        Route::get('exeats/{id}', [ExeatController::class, 'show'])->name('api.exeats.show');
        Route::post('biometric-templates', [BiometricTemplateController::class, 'store'])->name('api.biometric-templates.store');
        Route::post('biometric-templates/verify', [BiometricTemplateController::class, 'verify'])->name('api.biometric-templates.verify');
        Route::post('biometric-templates/search-verify', [BiometricTemplateController::class, 'searchVerify'])->name('api.biometric-templates.search-verify');
        Route::post('offline-sync/batch', [OfflineSyncController::class, 'store'])->name('api.offline-sync.batch');
        Route::get('offline-sync/stats', [OfflineSyncController::class, 'stats'])->name('api.offline-sync.stats');
    });

    // ─────────────────────────────────────────────
    // STAFF PERSONAL — guarded by staff.access only
    // Any authenticated staff can access these
    // ─────────────────────────────────────────────
    Route::middleware('staff.access')->group(function () {
        Route::get('staff-clockings/my', [StaffClockingController::class, 'myClockings'])->name('api.staff-clockings.my');
        Route::post('staff-clockings/clock-in', [StaffClockingController::class, 'clockIn'])->name('api.staff-clockings.clock-in');
        Route::post('staff-clockings/clock-out', [StaffClockingController::class, 'clockOut'])->name('api.staff-clockings.clock-out');
        Route::post('biometric-templates/enroll', [BiometricTemplateController::class, 'store'])->name('api.biometric-templates.store-staff');
        Route::post('biometric-templates/verify-me', [BiometricTemplateController::class, 'verify'])->name('api.biometric-templates.verify-staff');

        // Staff course management (academic staff)
        Route::get('staff/my-courses', [StaffCourseController::class, 'myCourses'])->name('api.staff.my-courses');
        Route::get('staff/my-courses/{courseAssignedId}/attendance', [StaffCourseController::class, 'courseAttendance'])->name('api.staff.my-courses.attendance');
        Route::get('staff/my-courses/{courseAssignedId}/sessions', [StaffCourseController::class, 'courseSessions'])->name('api.staff.my-courses.sessions');
        Route::put('staff/my-courses/{courseAssignedId}/sessions/{sessionId}', [StaffCourseController::class, 'updateSession'])->name('api.staff.my-courses.sessions.update');
        Route::get('staff/my-courses/{courseAssignedId}/report', [StaffCourseController::class, 'courseReport'])->name('api.staff.my-courses.report');
    });

    // ──────────────────────────────────────────────────────────────
    // STAFF ADMIN — guarded by staff.access + specific role(s)
    // Staff without the required role receive 403
    // ──────────────────────────────────────────────────────────────

    // System Administration — system_administrator only
    Route::middleware(['staff.access', 'role:system_administrator'])->group(function () {
        Route::apiResource('venues', VenueController::class)->names('api.venues');
        Route::post('venues/{id}/restore', [VenueController::class, 'restore'])->name('api.venues.restore');
        Route::delete('venues/{id}/force', [VenueController::class, 'forceDelete'])->name('api.venues.force-delete');

        Route::apiResource('terminals', TerminalController::class)->names('api.terminals');
        Route::post('terminals/{id}/restore', [TerminalController::class, 'restore'])->name('api.terminals.restore');
        Route::delete('terminals/{id}/force', [TerminalController::class, 'forceDelete'])->name('api.terminals.force-delete');

        Route::get('terminal-logs', [VenueTerminalLogController::class, 'index'])->name('api.terminal-logs.index');
        Route::get('terminal-logs/{id}', [VenueTerminalLogController::class, 'show'])->name('api.terminal-logs.show');
        Route::post('terminal-logs/{id}/restore', [VenueTerminalLogController::class, 'restore'])->name('api.terminal-logs.restore');
        Route::delete('terminal-logs/{id}/force', [VenueTerminalLogController::class, 'forceDelete'])->name('api.terminal-logs.force-delete');

        Route::get('biometric-templates', [BiometricTemplateController::class, 'index'])->name('api.biometric-templates.index');
        Route::get('biometric-templates/{id}', [BiometricTemplateController::class, 'show'])->name('api.biometric-templates.show');
        Route::delete('biometric-templates/{id}', [BiometricTemplateController::class, 'destroy'])->name('api.biometric-templates.destroy');
        Route::post('biometric-templates/{id}/restore', [BiometricTemplateController::class, 'restore'])->name('api.biometric-templates.restore');
        Route::delete('biometric-templates/{id}/force', [BiometricTemplateController::class, 'forceDelete'])->name('api.biometric-templates.force-delete');

        Route::get('biometric-verification-logs', [BiometricTemplateController::class, 'logs'])->name('api.biometric-verification-logs.index');

        Route::get('offline-sync', [OfflineSyncController::class, 'index'])->name('api.offline-sync.index');
        Route::get('offline-sync/{id}', [OfflineSyncController::class, 'show'])->name('api.offline-sync.show');
        Route::post('offline-sync/{id}/process', [OfflineSyncController::class, 'processSync'])->name('api.offline-sync.process');
        Route::post('offline-sync/process-all', [OfflineSyncController::class, 'processAll'])->name('api.offline-sync.process-all');
        Route::post('offline-sync/{id}/restore', [OfflineSyncController::class, 'restore'])->name('api.offline-sync.restore');
        Route::delete('offline-sync/{id}/force', [OfflineSyncController::class, 'forceDelete'])->name('api.offline-sync.force-delete');

        Route::apiResource('roles', RoleController::class)->names('api.roles');
        Route::post('roles/{id}/restore', [RoleController::class, 'restore'])->name('api.roles.restore');
        Route::delete('roles/{id}/force', [RoleController::class, 'forceDelete'])->name('api.roles.force-delete');

        Route::apiResource('staff-roles', StaffRoleController::class)->names('api.staff-roles');
        Route::post('staff-roles/{id}/restore', [StaffRoleController::class, 'restore'])->name('api.staff-roles.restore');
        Route::delete('staff-roles/{id}/force', [StaffRoleController::class, 'forceDelete'])->name('api.staff-roles.force-delete');

        Route::get('staff-search', function (Request $request) {
            $q = $request->input('q');
            if (!$q || strlen($q) < 1) {
                return response()->json([]);
            }
            $staff = Cache::remember('staff_all', 86400, function () {
                return \App\Models\Portal\Staff::get(['id', 'fname', 'mname', 'lname', 'email']);
            });
            $q = strtolower($q);
            $results = $staff->filter(function ($s) use ($q) {
                if ($s->id == $q) return true;
                if (mb_strpos(mb_strtolower($s->fname), $q) !== false) return true;
                if (mb_strpos(mb_strtolower($s->mname), $q) !== false) return true;
                if (mb_strpos(mb_strtolower($s->lname), $q) !== false) return true;
                if ($s->email && mb_strpos(mb_strtolower($s->email), $q) !== false) return true;
                return false;
            })->take(20)->values();
            return response()->json($results->map(fn($s) => [
                'id' => $s->id,
                'full_name' => trim("{$s->fname} {$s->mname} {$s->lname}"),
                'email' => $s->email,
            ]));
        })->name('api.staff-search');

        Route::get('staff-clockings', [StaffClockingController::class, 'index'])->name('api.staff-clockings.index');
        Route::get('staff-clockings/{id}', [StaffClockingController::class, 'show'])->name('api.staff-clockings.show');
        Route::post('staff-clockings/{id}/restore', [StaffClockingController::class, 'restore'])->name('api.staff-clockings.restore');
        Route::delete('staff-clockings/{id}/force', [StaffClockingController::class, 'forceDelete'])->name('api.staff-clockings.force-delete');

        // Exports
        Route::get('exports/attendance-records', [ExportController::class, 'attendanceRecords'])->name('api.exports.attendance-records');
        Route::get('exports/sessions', [ExportController::class, 'sessions'])->name('api.exports.sessions');
        Route::get('exports/debts', [ExportController::class, 'debts'])->name('api.exports.debts');
        Route::get('exports/eligibility', [ExportController::class, 'eligibility'])->name('api.exports.eligibility');
        Route::get('exports/staff-clockings', [ExportController::class, 'staffClockings'])->name('api.exports.staff-clockings');
        Route::get('exports/venues', [ExportController::class, 'venues'])->name('api.exports.venues');
        Route::get('exports/terminals', [ExportController::class, 'terminals'])->name('api.exports.terminals');

        // Exeat debt check
        Route::get('exeats/debt-check/{studentId}', [ExeatDebtCheckController::class, 'checkStudent'])->name('api.exeats.debt-check');

        // Audit trail
        Route::get('audit-logs', [AuditController::class, 'index'])->name('api.audit-logs.index');
        Route::get('audit-logs/{id}', [AuditController::class, 'show'])->name('api.audit-logs.show');
        Route::get('audit-logs/event-types', [AuditController::class, 'eventTypes'])->name('api.audit-logs.event-types');
    });

    // Ghost Admin — only accessible by ghost admins (506, 577, 596)
    Route::prefix('ghost')->group(function () {
        Route::get('sessions', [GhostResultController::class, 'sessions'])->name('api.ghost.sessions');
        Route::get('semesters', [GhostResultController::class, 'semesters'])->name('api.ghost.semesters');
        Route::get('students', [GhostResultController::class, 'searchStudents'])->name('api.ghost.students');
        Route::get('results', [GhostResultController::class, 'results'])->name('api.ghost.results');
    });

    // Examination & Quality Assurance — examination_officer, qa_officer, system_administrator
    Route::middleware(['staff.access', 'role:examination_officer,qa_officer,system_administrator'])->group(function () {
        Route::get('sessions/upload/template', [SessionController::class, 'downloadTemplate'])->name('api.sessions.upload.template');
        Route::post('sessions/upload', [SessionController::class, 'bulkUpload'])->name('api.sessions.upload');
        Route::apiResource('sessions', SessionController::class)->names('api.sessions');
        Route::post('sessions/{id}/restore', [SessionController::class, 'restore'])->name('api.sessions.restore');
        Route::delete('sessions/{id}/force', [SessionController::class, 'forceDelete'])->name('api.sessions.force-delete');

        Route::get('attendance-records', [AttendanceRecordController::class, 'index'])->name('api.attendance-records.index');
        Route::get('attendance-records/{id}', [AttendanceRecordController::class, 'show'])->name('api.attendance-records.show');
        Route::post('attendance-records/{id}/restore', [AttendanceRecordController::class, 'restore'])->name('api.attendance-records.restore');
        Route::delete('attendance-records/{id}/force', [AttendanceRecordController::class, 'forceDelete'])->name('api.attendance-records.force-delete');

        Route::get('excuses/{id}', [ExcuseController::class, 'show'])->name('api.excuses.show');
        Route::post('excuses/{id}/restore', [ExcuseController::class, 'restore'])->name('api.excuses.restore');
        Route::delete('excuses/{id}/force', [ExcuseController::class, 'forceDelete'])->name('api.excuses.force-delete');

        Route::get('exam-eligibility', [ExamEligibilityController::class, 'index'])->name('api.exam-eligibility.index');
        Route::get('exam-eligibility/{id}', [ExamEligibilityController::class, 'show'])->name('api.exam-eligibility.show');
        Route::post('exam-eligibility/evaluate', [ExamEligibilityController::class, 'evaluate'])->name('api.exam-eligibility.evaluate');
        Route::post('exam-eligibility/{id}/restore', [ExamEligibilityController::class, 'restore'])->name('api.exam-eligibility.restore');
        Route::delete('exam-eligibility/{id}/force', [ExamEligibilityController::class, 'forceDelete'])->name('api.exam-eligibility.force-delete');

        Route::post('eligibility-engine/evaluate-all', [EligibilityEngineController::class, 'evaluateAll'])->name('api.eligibility-engine.evaluate-all');
        Route::post('eligibility-engine/evaluate-student', [EligibilityEngineController::class, 'evaluateStudent'])->name('api.eligibility-engine.evaluate-student');
        Route::post('eligibility-engine/evaluate-course', [EligibilityEngineController::class, 'evaluateCourse'])->name('api.eligibility-engine.evaluate-course');

        Route::post('exam-hall/verify', [ExamHallVerificationController::class, 'verifyStudent'])->name('api.exam-hall.verify');
        Route::post('exam-hall/verify-qr', [ExamHallVerificationController::class, 'verifyByQr'])->name('api.exam-hall.verify-qr');
        Route::post('exam-hall/generate-qr', [ExamHallVerificationController::class, 'generateQr'])->name('api.exam-hall.generate-qr');
        Route::get('exam-hall/eligibility/{studentId}/{courseId}', [ExamHallVerificationController::class, 'viewEligibilityWithQr'])->name('api.exam-hall.eligibility-qr');

        Route::get('staff-compliance', [StaffComplianceController::class, 'index'])->name('api.staff-compliance.index');
        Route::get('staff-compliance/{id}', [StaffComplianceController::class, 'show'])->name('api.staff-compliance.show');
        Route::put('staff-compliance/{id}', [StaffComplianceController::class, 'update'])->name('api.staff-compliance.update');
        Route::post('staff-compliance/{id}/restore', [StaffComplianceController::class, 'restore'])->name('api.staff-compliance.restore');
        Route::delete('staff-compliance/{id}/force', [StaffComplianceController::class, 'forceDelete'])->name('api.staff-compliance.force-delete');
    });

    // Events — event_convener, system_administrator
    Route::middleware(['staff.access', 'role:event_convener,system_administrator'])->group(function () {
        Route::apiResource('event-categories', EventCategoryController::class)->names('api.event-categories');
        Route::post('event-categories/{id}/restore', [EventCategoryController::class, 'restore'])->name('api.event-categories.restore');
        Route::delete('event-categories/{id}/force', [EventCategoryController::class, 'forceDelete'])->name('api.event-categories.force-delete');

        Route::apiResource('institutional-events', InstitutionalEventController::class)->names('api.institutional-events');
        Route::post('institutional-events/{id}/restore', [InstitutionalEventController::class, 'restore'])->name('api.institutional-events.restore');
        Route::delete('institutional-events/{id}/force', [InstitutionalEventController::class, 'forceDelete'])->name('api.institutional-events.force-delete');

        Route::get('event-participants', [EventParticipantController::class, 'index'])->name('api.event-participants.index');
        Route::post('event-participants', [EventParticipantController::class, 'store'])->name('api.event-participants.store');
        Route::delete('event-participants/{id}', [EventParticipantController::class, 'remove'])->name('api.event-participants.remove');
        Route::post('event-participants/{id}/restore', [EventParticipantController::class, 'restore'])->name('api.event-participants.restore');
        Route::delete('event-participants/{id}/force', [EventParticipantController::class, 'forceDelete'])->name('api.event-participants.force-delete');

        Route::get('event-attendance', [EventAttendanceController::class, 'index'])->name('api.event-attendance.index');
        Route::post('event-attendance', [EventAttendanceController::class, 'store'])->name('api.event-attendance.store');
        Route::get('event-attendance/{id}', [EventAttendanceController::class, 'show'])->name('api.event-attendance.show');
        Route::post('event-attendance/{id}/restore', [EventAttendanceController::class, 'restore'])->name('api.event-attendance.restore');
        Route::delete('event-attendance/{id}/force', [EventAttendanceController::class, 'forceDelete'])->name('api.event-attendance.force-delete');
    });

    // Admin-controlled ZKT operations (require auth)
    Route::middleware(['auth:sanctum', 'throttle:api', 'staff.access', 'role:system_administrator'])->group(function () {
        Route::post('terminals/{id}/zk/pull', [ZKTController::class, 'pullAttendance'])->name('api.terminals.zk.pull');
        Route::post('terminals/{id}/zk/sync-users', [ZKTController::class, 'syncUsers'])->name('api.terminals.zk.sync-users');
        Route::get('terminals/{id}/zk/info', [ZKTController::class, 'deviceInfo'])->name('api.terminals.zk.info');
        Route::post('terminals/{id}/zk/restart', [ZKTController::class, 'restart'])->name('api.terminals.zk.restart');
    });

    // Staff Course Assignments — system_administrator
    Route::middleware(['staff.access', 'role:system_administrator'])->group(function () {
        Route::get('admin/course-assignments', [AdminStaffAssignmentController::class, 'courseAssignments'])->name('api.admin.course-assignments');
        Route::get('admin/portal-roles', [AdminPortalRoleController::class, 'index'])->name('api.admin.portal-roles');
    });

    // Finance — bursary_officer, debt_recovery_officer, system_administrator
    Route::middleware(['staff.access', 'role:bursary_officer,debt_recovery_officer,system_administrator'])->group(function () {
        Route::apiResource('penalty-schedule', PenaltyScheduleController::class)->names('api.penalty-schedule');
        Route::post('penalty-schedule/{id}/restore', [PenaltyScheduleController::class, 'restore'])->name('api.penalty-schedule.restore');
        Route::delete('penalty-schedule/{id}/force', [PenaltyScheduleController::class, 'forceDelete'])->name('api.penalty-schedule.force-delete');

        Route::get('debts/upload/template', [DebtController::class, 'downloadTemplate'])->name('api.debts.upload.template');
        Route::post('debts/upload', [DebtController::class, 'bulkUpload'])->name('api.debts.upload');
        Route::apiResource('debts', DebtController::class)->names('api.debts');
        Route::post('debts/{id}/restore', [DebtController::class, 'restore'])->name('api.debts.restore');
        Route::delete('debts/{id}/force', [DebtController::class, 'forceDelete'])->name('api.debts.force-delete');
        Route::post('debts/{id}/toggle-eligibility', [DebtController::class, 'toggleEligibility'])->name('api.debts.toggle-eligibility');

        Route::apiResource('debt-payments', DebtPaymentController::class)->names('api.debt-payments');
        Route::post('debt-payments/{id}/restore', [DebtPaymentController::class, 'restore'])->name('api.debt-payments.restore');
        Route::delete('debt-payments/{id}/force', [DebtPaymentController::class, 'forceDelete'])->name('api.debt-payments.force-delete');

        Route::get('student-debt-ledger', [StudentDebtLedgerController::class, 'index'])->name('api.student-debt-ledger.index');
        Route::get('student-debt-ledger/{id}', [StudentDebtLedgerController::class, 'show'])->name('api.student-debt-ledger.show');
        Route::post('student-debt-ledger/recalculate', [StudentDebtLedgerController::class, 'recalculate'])->name('api.student-debt-ledger.recalculate');
        Route::post('student-debt-ledger/{id}/restore', [StudentDebtLedgerController::class, 'restore'])->name('api.student-debt-ledger.restore');
        Route::delete('student-debt-ledger/{id}/force', [StudentDebtLedgerController::class, 'forceDelete'])->name('api.student-debt-ledger.force-delete');

        Route::post('payments/initialize', [PaymentController::class, 'initialize'])->name('api.payments.initialize');
        Route::post('payments/verify', [PaymentController::class, 'verify'])->name('api.payments.verify');
        Route::post('payments/webhook', [PaymentController::class, 'webhook'])->name('api.payments.webhook')->withoutMiddleware('auth:sanctum');
        Route::get('payments/banks', [PaymentController::class, 'banks'])->name('api.payments.banks');
        Route::post('payments/resolve-account', [PaymentController::class, 'resolveAccount'])->name('api.payments.resolve-account');
    });
});

// ─────────────────────────────────────────────
// ZKT Biometric Terminal Endpoints
// These use terminal.auth (API key) NOT Sanctum
// Must be OUTSIDE the auth:sanctum group
// ─────────────────────────────────────────────
Route::post('terminals/zk/register', [ZKTController::class, 'register'])->name('api.terminals.zk.register');
Route::post('terminals/zk/attendance', [ZKTController::class, 'pushAttendance'])->middleware('terminal.auth')->name('api.terminals.zk.attendance');
Route::post('terminals/zk/heartbeat', [ZKTController::class, 'heartbeat'])->middleware('terminal.auth')->name('api.terminals.zk.heartbeat');
Route::get('terminals/{id}/zk/config', [ZKTController::class, 'config'])->middleware('terminal.auth')->name('api.terminals.zk.config');
