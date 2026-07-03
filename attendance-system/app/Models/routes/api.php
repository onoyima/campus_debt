<?php

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
use App\Http\Controllers\Api\ExeatController;
use App\Http\Controllers\Api\ExcuseController;
use App\Http\Controllers\Api\InstitutionalEventController;
use App\Http\Controllers\Api\AttendanceRecordController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OfflineSyncController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PenaltyScheduleController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StaffClockingController;
use App\Http\Controllers\Api\StaffComplianceController;
use App\Http\Controllers\Api\StaffRoleController;
use App\Http\Controllers\Api\StatusTypeController;
use App\Http\Controllers\Api\StudentDashboardController;
use App\Http\Controllers\Api\StudentDebtLedgerController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\VenueController;
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

    // Core Infrastructure
    Route::apiResource('venues', VenueController::class)->names('api.venues');
    Route::apiResource('terminals', TerminalController::class)->names('api.terminals');
    Route::get('terminal-logs', [VenueTerminalLogController::class, 'index'])->name('api.terminal-logs.index');
    Route::get('terminal-logs/{id}', [VenueTerminalLogController::class, 'show'])->name('api.terminal-logs.show');

    // Sessions & Records
    Route::apiResource('sessions', SessionController::class)->names('api.sessions');
    Route::get('attendance-records', [AttendanceRecordController::class, 'index'])->name('api.attendance-records.index');
    Route::post('attendance-records', [AttendanceRecordController::class, 'store'])->name('api.attendance-records.store');
    Route::get('attendance-records/{id}', [AttendanceRecordController::class, 'show'])->name('api.attendance-records.show');
    Route::get('status-types', [StatusTypeController::class, 'index'])->name('api.status-types.index');

    // Excuses
    Route::apiResource('excuses', ExcuseController::class)->names('api.excuses');

    // Staff Clocking
    Route::get('staff-clockings', [StaffClockingController::class, 'index'])->name('api.staff-clockings.index');
    Route::get('staff-clockings/{id}', [StaffClockingController::class, 'show'])->name('api.staff-clockings.show');

    // Events
    Route::apiResource('event-categories', EventCategoryController::class)->names('api.event-categories');
    Route::apiResource('institutional-events', InstitutionalEventController::class)->names('api.institutional-events');
    Route::get('event-participants', [EventParticipantController::class, 'index'])->name('api.event-participants.index');
    Route::post('event-participants', [EventParticipantController::class, 'store'])->name('api.event-participants.store');
    Route::delete('event-participants/{id}', [EventParticipantController::class, 'remove'])->name('api.event-participants.remove');

    Route::get('event-attendance', [EventAttendanceController::class, 'index'])->name('api.event-attendance.index');
    Route::post('event-attendance', [EventAttendanceController::class, 'store'])->name('api.event-attendance.store');
    Route::get('event-attendance/{id}', [EventAttendanceController::class, 'show'])->name('api.event-attendance.show');

    // Penalties & Debts
    Route::apiResource('penalty-schedule', PenaltyScheduleController::class)->names('api.penalty-schedule');
    Route::apiResource('debts', DebtController::class)->names('api.debts');
    Route::apiResource('debt-payments', DebtPaymentController::class)->names('api.debt-payments');
    Route::get('student-debt-ledger', [StudentDebtLedgerController::class, 'index'])->name('api.student-debt-ledger.index');
    Route::get('student-debt-ledger/{id}', [StudentDebtLedgerController::class, 'show'])->name('api.student-debt-ledger.show');
    Route::post('student-debt-ledger/recalculate', [StudentDebtLedgerController::class, 'recalculate'])->name('api.student-debt-ledger.recalculate');

    // Payments
    Route::post('payments/initialize', [PaymentController::class, 'initialize'])->name('api.payments.initialize');
    Route::post('payments/verify', [PaymentController::class, 'verify'])->name('api.payments.verify');
    Route::post('payments/webhook', [PaymentController::class, 'webhook'])->name('api.payments.webhook')->withoutMiddleware('auth:sanctum');
    Route::get('payments/banks', [PaymentController::class, 'banks'])->name('api.payments.banks');
    Route::post('payments/resolve-account', [PaymentController::class, 'resolveAccount'])->name('api.payments.resolve-account');

    // Exam Eligibility
    Route::get('exam-eligibility', [ExamEligibilityController::class, 'index'])->name('api.exam-eligibility.index');
    Route::get('exam-eligibility/{id}', [ExamEligibilityController::class, 'show'])->name('api.exam-eligibility.show');
    Route::post('exam-eligibility/evaluate', [ExamEligibilityController::class, 'evaluate'])->name('api.exam-eligibility.evaluate');
    Route::post('eligibility-engine/evaluate-all', [EligibilityEngineController::class, 'evaluateAll'])->name('api.eligibility-engine.evaluate-all');
    Route::post('eligibility-engine/evaluate-student', [EligibilityEngineController::class, 'evaluateStudent'])->name('api.eligibility-engine.evaluate-student');
    Route::post('eligibility-engine/evaluate-course', [EligibilityEngineController::class, 'evaluateCourse'])->name('api.eligibility-engine.evaluate-course');

    // Biometrics
    Route::apiResource('biometric-templates', BiometricTemplateController::class)->names('api.biometric-templates');
    Route::post('biometric-templates/verify', [BiometricTemplateController::class, 'verify'])->name('api.biometric-templates.verify');
    Route::post('biometric-templates/search-verify', [BiometricTemplateController::class, 'searchVerify'])->name('api.biometric-templates.search-verify');
    Route::get('biometric-verification-logs', [BiometricTemplateController::class, 'logs'])->name('api.biometric-verification-logs.index');

    // Offline Sync
    Route::get('offline-sync', [OfflineSyncController::class, 'index'])->name('api.offline-sync.index');
    Route::post('offline-sync/batch', [OfflineSyncController::class, 'store'])->name('api.offline-sync.batch');
    Route::get('offline-sync/stats', [OfflineSyncController::class, 'stats'])->name('api.offline-sync.stats');
    Route::get('offline-sync/{id}', [OfflineSyncController::class, 'show'])->name('api.offline-sync.show');
    Route::post('offline-sync/{id}/process', [OfflineSyncController::class, 'processSync'])->name('api.offline-sync.process');
    Route::post('offline-sync/process-all', [OfflineSyncController::class, 'processAll'])->name('api.offline-sync.process-all');

    // RBAC
    Route::apiResource('roles', RoleController::class)->names('api.roles');
    Route::apiResource('staff-roles', StaffRoleController::class)->names('api.staff-roles');

    // Staff Compliance
    Route::get('staff-compliance', [StaffComplianceController::class, 'index'])->name('api.staff-compliance.index');
    Route::get('staff-compliance/{id}', [StaffComplianceController::class, 'show'])->name('api.staff-compliance.show');
    Route::put('staff-compliance/{id}', [StaffComplianceController::class, 'update'])->name('api.staff-compliance.update');

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('api.notifications.index');
    Route::get('notifications/{id}', [NotificationController::class, 'show'])->name('api.notifications.show');
    Route::post('notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('api.notifications.mark-read');

    // Exeat Integration
    Route::get('exeats', [ExeatController::class, 'index'])->name('api.exeats.index');
    Route::get('exeats/{id}', [ExeatController::class, 'show'])->name('api.exeats.show');

    // Student Dashboard
    Route::get('student-dashboard/overview', [StudentDashboardController::class, 'overview'])->name('api.student-dashboard.overview');

    // System Dashboard
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('api.dashboard.stats');
});
