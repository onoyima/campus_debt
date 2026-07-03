<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('/login', function () {
    return Inertia::render('Login');
});

Route::get('/dashboard', fn() => Inertia::render('Dashboard'));

Route::get('/venues', fn() => Inertia::render('Venues/Index'));
Route::get('/venues/create', fn() => Inertia::render('Venues/Form'));
Route::get('/venues/{id}/edit', fn() => Inertia::render('Venues/Form'));

Route::get('/terminals', fn() => Inertia::render('Terminals/Index'));
Route::get('/terminals/create', fn() => Inertia::render('Terminals/Form'));
Route::get('/terminals/{id}/edit', fn() => Inertia::render('Terminals/Form'));

Route::get('/sessions', fn() => Inertia::render('Sessions/Index'));
Route::get('/sessions/create', fn() => Inertia::render('Sessions/Form'));
Route::get('/sessions/{id}/edit', fn() => Inertia::render('Sessions/Form'));

Route::get('/events', fn() => Inertia::render('Events/Index'));
Route::get('/events/create', fn() => Inertia::render('Events/Form'));
Route::get('/events/{id}/edit', fn() => Inertia::render('Events/Form'));

Route::get('/event-categories', fn() => Inertia::render('EventCategories/Index'));

Route::get('/attendance-records', fn() => Inertia::render('AttendanceRecords/Index'));

Route::get('/excuses', fn() => Inertia::render('Excuses/Index'));

Route::get('/staff-clockings', fn() => Inertia::render('StaffClockings/Index'));

Route::get('/debts', fn() => Inertia::render('Debts/Index'));
Route::get('/debts/recovery', fn() => Inertia::render('Debts/RecoveryDashboard'));

Route::get('/penalties', fn() => Inertia::render('Penalties/Index'));
Route::get('/penalties/create', fn() => Inertia::render('Penalties/Form'));
Route::get('/penalties/{id}/edit', fn() => Inertia::render('Penalties/Form'));

Route::get('/eligibility', fn() => Inertia::render('Eligibility/Index'));
Route::get('/eligibility/engine', fn() => Inertia::render('Eligibility/Engine'));

Route::get('/payments', fn() => Inertia::render('Payments/Index'));

Route::get('/notifications', fn() => Inertia::render('Notifications/Index'));

Route::get('/staff-compliance', fn() => Inertia::render('StaffCompliance/Index'));

Route::get('/quality-assurance', fn() => Inertia::render('QualityAssurance/Dashboard'));

Route::get('/biometrics', fn() => Inertia::render('Biometrics/Index'));

Route::get('/roles', fn() => Inertia::render('Roles/Index'));
Route::get('/roles/create', fn() => Inertia::render('Roles/Form'));
Route::get('/roles/{id}/edit', fn() => Inertia::render('Roles/Form'));

Route::get('/staff-roles', fn() => Inertia::render('StaffRoles/Index'));
Route::get('/staff-roles/create', fn() => Inertia::render('StaffRoles/Form'));
Route::get('/staff-roles/{id}/edit', fn() => Inertia::render('StaffRoles/Form'));

Route::get('/exeats', fn() => Inertia::render('Exeats/Index'));
Route::get('/exeats/{id}', fn() => Inertia::render('Exeats/Show'));

Route::get('/student-dashboard', fn() => Inertia::render('StudentDashboard/Index'));

Route::get('/exam-clearance', fn() => Inertia::render('ExamClearance/Index'));
Route::get('/exam-clearance/verify', fn() => Inertia::render('ExamClearance/Verify'));

Route::get('/offline-sync', fn() => Inertia::render('OfflineSync/Index'));

Route::get('/terminal-logs', fn() => Inertia::render('TerminalLogs/Index'));

Route::get('/profile', fn() => Inertia::render('Profile'));
