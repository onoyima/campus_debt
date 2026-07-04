<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            SecurityHeaders::class,
        ]);

        $middleware->api(prepend: [
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'security.headers' => SecurityHeaders::class,
            'role' => \App\Http\Middleware\CheckAttendanceRole::class,
            'student.access' => \App\Http\Middleware\CheckStudentAccess::class,
            'staff.access' => \App\Http\Middleware\CheckStaffAccess::class,
            'terminal.auth' => \App\Http\Middleware\TerminalAuthMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
