@echo off
cd /d "%~dp0"
node scripts\setup-local.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
node src\server\create-admin.mjs
pause
