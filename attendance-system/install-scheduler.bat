@echo off
echo Registering Attendance Scheduler as a Windows startup task...
schtasks /create /tn "AttendanceScheduler" /tr "\"%~dp0scheduler.bat\"" /sc onstart /rl highest /f
echo.
echo Done. The scheduler will start automatically on boot.
echo To start it now, run: schtasks /run /tn "AttendanceScheduler"
echo To remove it later:   schtasks /delete /tn "AttendanceScheduler" /f
pause
