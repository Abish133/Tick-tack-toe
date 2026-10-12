@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or later, then run this launcher again.
  pause
  exit /b 1
)
node scripts\start-local.mjs
if errorlevel 1 pause
