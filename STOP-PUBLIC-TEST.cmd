@echo off
cd /d "%~dp0"
node scripts\stop-public-test.mjs
if errorlevel 1 pause
