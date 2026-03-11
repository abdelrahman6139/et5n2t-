@echo off
chcp 65001 >nul
title وكيل الطباعة - Yarb Print Agent

cd /d "%~dp0"

:: Kill any previous agent on port 5078 so we never get EADDRINUSE
echo [1/3] ايقاف اي نسخ قديمة...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5078 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
  echo     Killed PID %%a
)
timeout /t 1 /nobreak >nul

:: Check node_modules
if not exist "node_modules\" (
  echo [2/3] تثبيت الحزم...
  call npm install
  if errorlevel 1 (
    echo [خطأ] فشل تثبيت الحزم
    pause
    exit /b 1
  )
) else (
  echo [2/3] الحزم موجودة.
)

echo [3/3] تشغيل وكيل الطباعة...
echo.
echo  الطابعة : inv2
echo  العنوان : http://localhost:5078
echo  لايقاف  : اغلق هذه النافذة
echo.

node server.js

echo.
echo [!] توقف وكيل الطباعة
pause
