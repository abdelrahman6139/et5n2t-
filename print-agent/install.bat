@echo off
chcp 65001 >nul
title تثبيت وكيل الطباعة - Yarb Print Agent

echo.
echo ████████████████████████████████████████████
echo █      Yarb Print Agent — Install          █
echo ████████████████████████████████████████████
echo.

cd /d "%~dp0"

:: Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
  echo [خطأ] Node.js غير مثبت!
  echo يرجى تنزيل Node.js من: https://nodejs.org
  pause
  exit /b 1
)

echo [1/2] تثبيت الحزم...
call npm install

if errorlevel 1 (
  echo [خطأ] فشل تثبيت الحزم
  pause
  exit /b 1
)

echo.
echo [2/2] تحميل Chromium (مرة واحدة فقط ~130MB)...
node -e "const p=require('puppeteer'); p.executablePath ? console.log('Chromium ready: '+p.executablePath()) : console.log('downloading...')"

echo.
echo ████████████████████████████████████████████
echo █        ✅ التثبيت اكتمل بنجاح!          █
echo █                                          █
echo █  بعد التثبيت:                           █
echo █    1. افتح config.json واضع أسماء       █
echo █       الطابعات الصحيحة                  █
echo █    2. شغّل Start-Agent.bat              █
echo █    3. من لوحة الإعدادات في النظام       █
echo █       ضع: http://localhost:5078          █
echo ████████████████████████████████████████████
echo.
pause
