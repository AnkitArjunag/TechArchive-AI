@echo off
echo ===============================
echo   Starting TechArchive AI
echo ===============================

:: Start Ollama (from correct directory)
echo Starting Ollama...
start "OLLAMA" cmd /k "cd /d D:\BEL_2026 && ollama serve"

:: Start Backend
echo Starting Backend...
start "BACKEND" cmd /k "cd /d D:\BEL_2026\dashboard\backend && uvicorn main:app --reload"

:: Start Frontend
echo Starting Frontend...
start "FRONTEND" cmd /k "cd /d D:\BEL_2026\dashboard && npm start"

echo ===============================
echo   All services started!
echo ===============================
pause