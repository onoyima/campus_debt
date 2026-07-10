@echo off
title Attendance Scheduler
cd /d "%~dp0"
:loop
php artisan schedule:run
timeout /t 60 /nobreak >nul
goto loop
