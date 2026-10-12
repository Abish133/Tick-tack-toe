@echo off
cd /d "%~dp0"
node scripts\start-public-test.mjs
if errorlevel 1 pause
