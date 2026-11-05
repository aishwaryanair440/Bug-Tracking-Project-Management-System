@echo off
echo Starting MySQL Server...
start "MySQL Server" cmd /k "C:\mysql-8.4\bin\mysqld.exe --defaults-file=C:\mysql-8.4\my.ini --console"
timeout /t 3 /nobreak >nul

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 /nobreak >nul

echo Starting Frontend Dev Server...
start "Frontend Dev Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ======================================================
echo All services have been launched!
echo Frontend: http://localhost:8443
echo Backend:  http://localhost:5000
echo Database: localhost:3306 (MySQL)
echo ======================================================
pause
