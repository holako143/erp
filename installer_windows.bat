@echo off
chcp 65001 >nul
title تثبيت وتجهيز نظام حاسب المحاسبي (Haseb ERP) - التشغيل المتكامل بدون إنترنت
color 0A

:: ============================================================================
:: طلب صلاحيات المسؤول تلقائياً (UAC Auto-Elevation) لتطبيق جدار الحماية والمنفذ
:: ============================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] جاري طلب صلاحيات المسؤول لتطبيق قواعد جدار الحماية وصلاحيات المنفذ...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs" >nul 2>&1
    if %errorlevel% equ 0 exit /b 0
    echo [تنبيه] لم يتم منح صلاحيات المسؤول؛ قد يتطلب جدار الحماية موافقة يدوية.
)

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

echo ===============================================================================
echo   نظام حاسب المحاسبي (Haseb ERP) - برنامج التثبيت الشامل والتشغيل بدون إنترنت
echo   إعداد تلقائي: المنفذ 3000/3443 + جدار الحماية + ADB USB SMS + سطح المكتب
echo ===============================================================================
echo.

:: [1/6] تحديد محرك التشغيل المدمج أو المحلي بدون تحميل أي موارد من الإنترنت
echo [1/6] فحص محرك التشغيل المحلي...
set "NODE_CMD="
set "RUNTIME_KIND="
if exist "%SCRIPT_DIR%\runtime\node.exe" (
    set "NODE_CMD=%SCRIPT_DIR%\runtime\node.exe"
    set "RUNTIME_KIND=node-portable"
    echo   [OK] تم العثور على محرك التشغيل المدمج (runtime\node.exe) بدون إنترنت.
) else (
    where bun >nul 2>&1
    if %errorlevel% equ 0 (
        set "NODE_CMD=bun"
        set "RUNTIME_KIND=bun"
        echo   [OK] تم العثور على محرك Bun.
    ) else (
        where node >nul 2>&1
        if %errorlevel% equ 0 (
            set "NODE_CMD=node"
            set "RUNTIME_KIND=node"
            echo   [OK] تم العثور على Node.js المثبت مسبقاً.
        )
    )
)
if "%NODE_CMD%"=="" (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        set "RUNTIME_KIND=node"
        echo   [OK] تم العثور على Node.js في Program Files.
    )
)
if "%NODE_CMD%"=="" (
    echo   [خطأ] لم يتم العثور على runtime\node.exe أو Node.js على هذا الجهاز.
    echo   تأكد من استخراج مجلد الحزمة المحمولة بالكامل أو تثبيت Node.js v20+.
    pause
    exit /b 1
)

:: [2/6] فتح جدار الحماية (Windows Defender Firewall) للمنافذ 3000 و 3443 و 5037
echo [2/6] إعداد صلاحيات جدار الحماية والمنافذ للشبكة المحلية (LAN / Wi-Fi)...
netsh advfirewall firewall delete rule name="Haseb ERP HTTP (3000)" >nul 2>&1
netsh advfirewall firewall delete rule name="Haseb ERP HTTPS (3443)" >nul 2>&1
netsh advfirewall firewall delete rule name="Haseb ERP ADB Bridge (5037)" >nul 2>&1
netsh advfirewall firewall add rule name="Haseb ERP HTTP (3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Haseb ERP HTTP (3000) Out" dir=out action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Haseb ERP HTTPS (3443)" dir=in action=allow protocol=TCP localport=3443 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Haseb ERP ADB Bridge (5037)" dir=in action=allow protocol=TCP localport=5037 profile=any >nul 2>&1
if not "%NODE_CMD%"=="node" if not "%NODE_CMD%"=="bun" (
    netsh advfirewall firewall add rule name="Haseb ERP Runtime Executable" dir=in action=allow program="%NODE_CMD%" enable=yes profile=any >nul 2>&1
)
netsh http add urlacl url=http://+:3000/ user=Everyone >nul 2>&1
netsh http add urlacl url=https://+:3443/ user=Everyone >nul 2>&1
echo   [OK] تم فتح المنافذ (3000 / 3443 / 5037) وصلاحيات الشبكة المحلية.

:: [3/6] تهيئة جسر رسائل SMS ومراقبة منافذ USB / ADB تلقائياً
echo [3/6] تهيئة جسر USB / ADB للتعرف الفوري على الجوال بمجرد توصيل السلك...
set "ADB_EXE="
if exist "%SCRIPT_DIR%\platform-tools\adb.exe" set "ADB_EXE=%SCRIPT_DIR%\platform-tools\adb.exe"
if "%ADB_EXE%"=="" if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if "%ADB_EXE%"=="" if exist "C:\platform-tools\adb.exe" set "ADB_EXE=C:\platform-tools\adb.exe"
if "%ADB_EXE%"=="" if exist "C:\adb\adb.exe" set "ADB_EXE=C:\adb\adb.exe"
if "%ADB_EXE%"=="" (
    for /f "delims=" %%I in ('where adb.exe 2^>nul') do if not defined ADB_EXE set "ADB_EXE=%%I"
)
if defined ADB_EXE (
    echo   [OK] تم العثور على أداة ADB في: %ADB_EXE%
    "%ADB_EXE%" start-server >nul 2>&1
    "%ADB_EXE%" devices -l
) else (
    echo   [معلومة] إذا أردت ربط الأندرويد بكيبل USB (ADB)، ضع platform-tools\adb.exe بجانب البرنامج أو استخدم مودم COM / Web Serial.
)

:: [4/6] اختيار وضع التشغيل الجاهز بدون أي تحميل إنترنت
echo [4/6] التحقق من جاهزية ملفات التشغيل المتكاملة...
set "LAUNCH_MODE="
if exist "%SCRIPT_DIR%\bundle\server.bundle.cjs" if exist "%SCRIPT_DIR%\dist\index.html" (
    set "LAUNCH_MODE=BUNDLE"
    echo   [OK] الحزمة المستقلة جاهزة (bundle\server.bundle.cjs + dist) - تشغيل فوري بدون إنترنت.
)
if "%LAUNCH_MODE%"=="" if exist "%SCRIPT_DIR%\dist\index.html" if exist "%SCRIPT_DIR%\node_modules" (
    set "LAUNCH_MODE=DIST_PROD"
    echo   [OK] ملفات الإنتاج والاعتماديات موجودة محلياً - لا حاجة لأي تحميل.
)
if "%LAUNCH_MODE%"=="" (
    if not exist "%SCRIPT_DIR%\node_modules" (
        echo   [تنبيه] وضع المصدر الخام: تثبيت الاعتماديات المحلية...
        if "%RUNTIME_KIND%"=="bun" (call bun install) else (call npm install)
    )
    if not exist "%SCRIPT_DIR%\dist\index.html" (
        echo   [تنبيه] بناء الواجهة محلياً لأول مرة...
        if "%RUNTIME_KIND%"=="bun" (call bun run build) else (call npm run build)
    )
    set "LAUNCH_MODE=DEV_SOURCE"
)

:: [5/6] إنشاء ملف التشغيل التلقائي واختصارات سطح المكتب
echo [5/6] إنشاء اختصارات سطح المكتب للتشغيل الفوري...
set "RUNNER_BAT=%SCRIPT_DIR%\تشغيل_حاسب_ERP.bat"
(
echo @echo off
echo chcp 65001 ^>nul
echo title نظام حاسب المحاسبي (Haseb ERP)
echo cd /d "%~dp0"
echo set "NODE_ENV=production"
echo set "PORT=3000"
echo set "HTTPS_PORT=3443"
echo start "" cmd /c "timeout /t 2 /nobreak ^>nul ^&^& (start msedge.exe --app=http://localhost:3000 --start-maximized 2^>nul ^|^| start chrome.exe --app=http://localhost:3000 --start-maximized 2^>nul ^|^| start http://localhost:3000)"
if "%LAUNCH_MODE%"=="BUNDLE" (
    echo "%NODE_CMD%" "%~dp0bundle\server.bundle.cjs"
) else (
    if "%RUNTIME_KIND%"=="bun" (
        echo bun server.ts
    ) else (
        echo call npx tsx server.ts
    )
)
) > "%RUNNER_BAT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut($desk + '\تشغيل نظام حاسب المحاسبي.lnk'); $s.TargetPath = '%RUNNER_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'نظام حاسب المحاسبي (Haseb ERP) - يعمل بدون إنترنت + LAN'; $s.Save()" >nul 2>&1
echo   [OK] تم إنشاء اختصار سطح المكتب: تشغيل نظام حاسب المحاسبي
echo   [LAN] رابط الدخول من أي جوال أو تابلت على نفس الواي فاي: http://YOUR-PC-IP:3000

:: [6/6] التشغيل الفوري للنظام الآن
echo [6/6] التجهيز مكتمل بنسبة 100%%! جاري تشغيل النظام الآن...
echo.
call "%RUNNER_BAT%"