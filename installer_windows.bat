@echo off
title تثبيت وتشغيل نظام ASF المحاسبي ونظام التراخيص المعتمد V2
color 0A
chcp 65001 >nul

echo ===============================================================================
echo                نظام ASF ENTERPRISE ERP - الإصدار المؤسسي المعتمد
echo               برنامج التثبيت الشامل لسطح المكتب والشبكة المحلية (LAN)
echo ===============================================================================
echo.

:: 1. التحقق من صلاحيات المدير
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ملاحظة] يفضل تشغيل ملف التثبيت بصلاحيات مسؤول (Run as Administrator) لتثبيت الخدمات تلقائياً.
)

:: 2. فحص بيئة التشغيل Node.js أو Bun
echo [1/5] التحقق من بيئة التشغيل البرمجية...
set RUNTIME=
where bun >nul 2>&1
if %errorlevel% equ 0 (
    set RUNTIME=bun
    echo [OK] تم العثور على محرك Bun السريع.
) else (
    where node >nul 2>&1
    if %errorlevel% equ 0 (
        set RUNTIME=node
        echo [OK] تم العثور على محرك Node.js.
    ) else (
        echo [!] لم يتم العثور على Bun أو Node.js مثبت على هذا الجهاز.
        echo جاري فتح رابط التحميل التلقائي...
        start https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 3. تثبيت الاعتماديات وحزم النظام
echo [2/5] تثبيت اعتمادات وحزم النظام المحاسبي محلياً...
if "%RUNTIME%"=="bun" (
    call bun install
) else (
    call npm install
)

:: 4. بناء ملفات الواجهة والإنتاج
echo [3/5] بناء وتجهيز واجهات سطح المكتب والمحاسبة والشبكة...
if "%RUNTIME%"=="bun" (
    call bun run build
) else (
    call npm run build
)

:: 5. إنشاء اختصارات سطح المكتب للبرنامج المحاسبي وبرنامج التفعيل
echo [4/5] إنشاء اختصارات سطح المكتب للبرنامج المحاسبي وأداة التفعيل...
set SCRIPT_DIR=%~dp0
set DESKTOP_DIR=%USERPROFILE%\Desktop

echo @echo off > "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"
echo title تشغيل نظام ASF المحاسبي المؤسسي >> "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"
echo cd /d "%SCRIPT_DIR%" >> "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"
echo echo جاري تشغيل خادم المحاسبة والشبكة المحلية... >> "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"
echo start http://localhost:3000 >> "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"
echo %RUNTIME% server.ts >> "%DESKTOP_DIR%\تشغيل نظام ASF المحاسبي.bat"

echo @echo off > "%DESKTOP_DIR%\أداة التفعيل والتراخيص ASF.bat"
echo title أداة إصدار وتفعيل تراخيص ASF >> "%DESKTOP_DIR%\أداة التفعيل والتراخيص ASF.bat"
echo cd /d "%SCRIPT_DIR%" >> "%DESKTOP_DIR%\أداة التفعيل والتراخيص ASF.bat"
echo %RUNTIME% scripts/license_admin_cli.ts >> "%DESKTOP_DIR%\أداة التفعيل والتراخيص ASF.bat"
echo pause >> "%DESKTOP_DIR%\أداة التفعيل والتراخيص ASF.bat"

:: 6. فتح البرنامج والشبكة
echo [5/5] تم اكتمال التثبيت بنجاح تام!
echo.
echo ===============================================================================
echo  تم إنشاء اختصارين على سطح المكتب:
echo   1. [تشغيل نظام ASF المحاسبي.bat] - لتشغيل البرنامج المحاسبي والشبكة المحلية
echo   2. [أداة التفعيل والتراخيص ASF.bat] - أداة الإدارة وإصدار وتفعيل التراخيص
echo ===============================================================================
echo.
set /p START_NOW=هل تريد تشغيل النظام المحاسبي الآن؟ (Y/N):
if /i "%START_NOW%"=="Y" (
    start http://localhost:3000
    %RUNTIME% server.ts
)
pause
