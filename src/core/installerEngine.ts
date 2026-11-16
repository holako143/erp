/**
 * Haseb Enterprise ERP - Zero-Download Installer, Firewall & Portable Bundle Engine
 * Pure deterministic generators for Windows (.bat), Linux/macOS (.sh),
 * offline zero-dependency ZIP bundles (STORE CRC32), and OS readiness checks.
 */

export interface InstallerScriptOptions {
  port?: number;
  httpsPort?: number;
  primaryLanIp?: string;
  appNameAr?: string;
}

export interface SystemReadinessReport {
  platform: string;
  arch: string;
  hostname: string;
  port: number;
  httpsPort: number | null;
  httpsEnabled: boolean;
  lanAddresses: string[];
  primaryLanUrl: string;
  distReady: boolean;
  bundleReady: boolean;
  adbAvailable: boolean;
  adbPath: string | null;
  adbDaemonRunning: boolean;
  serialPortsCount: number;
  serialPorts: string[];
  firewallStatus: 'CONFIGURED' | 'NEEDS_ADMIN_RUN' | 'CONTAINER_MANAGED' | 'UNKNOWN';
  firewallDetailsAr: string;
  zeroDownloadReady: boolean;
  checkedAt: string;
}

export interface ZipEntryInput {
  name: string;
  data: Uint8Array | Buffer;
}

/**
 * Generates the Self-Contained All-in-One Windows Setup & Firewall Launcher (.bat).
 * - Auto-requests UAC Administrator privileges for firewall & HTTP ACL registration.
 * - Opens Windows Defender Firewall Inbound & Outbound TCP Ports 3000, 3443, 5037.
 * - Registers HTTP URL ACL permissions (`netsh http add urlacl`).
 * - Auto-locates bundled/local/Android-SDK `adb.exe` and starts the USB bridge daemon.
 * - Runs completely OFFLINE using prebuilt `bundle/server.bundle.cjs` + `dist/` with zero `npm install`.
 * - Creates Windows Desktop Shortcuts (Frameless App + Firewall Utility).
 */
export function generateWindowsSetupBat(options: InstallerScriptOptions = {}): string {
  const port = Number(options.port) || 3000;
  const httpsPort = Number(options.httpsPort) || 3443;
  const lanIp = (options.primaryLanIp || '').trim();
  const appNameAr = options.appNameAr || 'نظام حاسب المحاسبي (Haseb ERP)';
  const lanHintUrl = lanIp ? `http://${lanIp}:${port}` : `http://YOUR-PC-IP:${port}`;

  const lines: string[] = [
    '@echo off',
    'chcp 65001 >nul',
    `title تثبيت وتجهيز ${appNameAr} - التشغيل المتكامل بدون إنترنت`,
    'color 0A',
    '',
    ':: ============================================================================',
    ':: طلب صلاحيات المسؤول تلقائياً (UAC Auto-Elevation) لتطبيق جدار الحماية والمنفذ',
    ':: ============================================================================',
    'net session >nul 2>&1',
    'if %errorlevel% neq 0 (',
    '    echo [!] جاري طلب صلاحيات المسؤول لتطبيق قواعد جدار الحماية وصلاحيات المنفذ...',
    '    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath \'%~f0\' -ArgumentList \'%*\' -Verb RunAs" >nul 2>&1',
    '    if %errorlevel% equ 0 exit /b 0',
    '    echo [تنبيه] لم يتم منح صلاحيات المسؤول؛ قد يتطلب جدار الحماية موافقة يدوية.',
    ')',
    '',
    'set "SCRIPT_DIR=%~dp0"',
    'if "%SCRIPT_DIR:~-1%"=="\\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"',
    'cd /d "%SCRIPT_DIR%"',
    '',
    'echo ===============================================================================',
    `echo   ${appNameAr} - برنامج التثبيت الشامل والتشغيل بدون إنترنت`,
    'echo   إعداد تلقائي: المنفذ 3000/3443 + جدار الحماية + ADB USB SMS + سطح المكتب',
    'echo ===============================================================================',
    'echo.',
    '',
    ':: [1/6] تحديد محرك التشغيل المدمج أو المحلي بدون تحميل أي موارد من الإنترنت',
    'echo [1/6] فحص محرك التشغيل المحلي...',
    'set "NODE_CMD="',
    'set "RUNTIME_KIND="',
    'if exist "%SCRIPT_DIR%\\runtime\\node.exe" (',
    '    set "NODE_CMD=%SCRIPT_DIR%\\runtime\\node.exe"',
    '    set "RUNTIME_KIND=node-portable"',
    '    echo   [OK] تم العثور على محرك التشغيل المدمج (runtime\\node.exe) بدون إنترنت.',
    ') else (',
    '    where bun >nul 2>&1',
    '    if %errorlevel% equ 0 (',
    '        set "NODE_CMD=bun"',
    '        set "RUNTIME_KIND=bun"',
    '        echo   [OK] تم العثور على محرك Bun.',
    '    ) else (',
    '        where node >nul 2>&1',
    '        if %errorlevel% equ 0 (',
    '            set "NODE_CMD=node"',
    '            set "RUNTIME_KIND=node"',
    '            echo   [OK] تم العثور على Node.js المثبت مسبقاً.',
    '        )',
    '    )',
    ')',
    'if "%NODE_CMD%"=="" (',
    '    if exist "C:\\Program Files\\nodejs\\node.exe" (',
    '        set "NODE_CMD=C:\\Program Files\\nodejs\\node.exe"',
    '        set "RUNTIME_KIND=node"',
    '        echo   [OK] تم العثور على Node.js في Program Files.',
    '    )',
    ')',
    'if "%NODE_CMD%"=="" (',
    '    echo   [خطأ] لم يتم العثور على runtime\\node.exe أو Node.js على هذا الجهاز.',
    '    echo   تأكد من استخراج مجلد الحزمة المحمولة بالكامل أو تثبيت Node.js v20+.',
    '    pause',
    '    exit /b 1',
    ')',
    '',
    ':: [2/6] فتح جدار الحماية (Windows Defender Firewall) للمنافذ 3000 و 3443 و 5037',
    'echo [2/6] إعداد صلاحيات جدار الحماية والمنافذ للشبكة المحلية (LAN / Wi-Fi)...',
    `netsh advfirewall firewall delete rule name="Haseb ERP HTTP (${port})" >nul 2>&1`,
    `netsh advfirewall firewall delete rule name="Haseb ERP HTTPS (${httpsPort})" >nul 2>&1`,
    'netsh advfirewall firewall delete rule name="Haseb ERP ADB Bridge (5037)" >nul 2>&1',
    `netsh advfirewall firewall add rule name="Haseb ERP HTTP (${port})" dir=in action=allow protocol=TCP localport=${port} profile=any >nul 2>&1`,
    `netsh advfirewall firewall add rule name="Haseb ERP HTTP (${port}) Out" dir=out action=allow protocol=TCP localport=${port} profile=any >nul 2>&1`,
    `netsh advfirewall firewall add rule name="Haseb ERP HTTPS (${httpsPort})" dir=in action=allow protocol=TCP localport=${httpsPort} profile=any >nul 2>&1`,
    'netsh advfirewall firewall add rule name="Haseb ERP ADB Bridge (5037)" dir=in action=allow protocol=TCP localport=5037 profile=any >nul 2>&1',
    'if not "%NODE_CMD%"=="node" if not "%NODE_CMD%"=="bun" (',
    '    netsh advfirewall firewall add rule name="Haseb ERP Runtime Executable" dir=in action=allow program="%NODE_CMD%" enable=yes profile=any >nul 2>&1',
    ')',
    `netsh http add urlacl url=http://+:${port}/ user=Everyone >nul 2>&1`,
    `netsh http add urlacl url=https://+:${httpsPort}/ user=Everyone >nul 2>&1`,
    `echo   [OK] تم فتح المنافذ (${port} / ${httpsPort} / 5037) وصلاحيات الشبكة المحلية.`,
    '',
    ':: [3/6] تهيئة جسر رسائل SMS ومراقبة منافذ USB / ADB تلقائياً',
    'echo [3/6] تهيئة جسر USB / ADB للتعرف الفوري على الجوال بمجرد توصيل السلك...',
    'set "ADB_EXE="',
    'if exist "%SCRIPT_DIR%\\platform-tools\\adb.exe" set "ADB_EXE=%SCRIPT_DIR%\\platform-tools\\adb.exe"',
    'if "%ADB_EXE%"=="" if exist "%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe" set "ADB_EXE=%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe"',
    'if "%ADB_EXE%"=="" if exist "C:\\platform-tools\\adb.exe" set "ADB_EXE=C:\\platform-tools\\adb.exe"',
    'if "%ADB_EXE%"=="" if exist "C:\\adb\\adb.exe" set "ADB_EXE=C:\\adb\\adb.exe"',
    'if "%ADB_EXE%"=="" (',
    '    for /f "delims=" %%I in (\'where adb.exe 2^>nul\') do if not defined ADB_EXE set "ADB_EXE=%%I"',
    ')',
    'if defined ADB_EXE (',
    '    echo   [OK] تم العثور على أداة ADB في: %ADB_EXE%',
    '    "%ADB_EXE%" start-server >nul 2>&1',
    '    "%ADB_EXE%" devices -l',
    ') else (',
    '    echo   [معلومة] إذا أردت ربط الأندرويد بكيبل USB (ADB)، ضع platform-tools\\adb.exe بجانب البرنامج أو استخدم مودم COM / Web Serial.',
    ')',
    '',
    ':: [4/6] اختيار وضع التشغيل الجاهز بدون أي تحميل إنترنت',
    'echo [4/6] التحقق من جاهزية ملفات التشغيل المتكاملة...',
    'set "LAUNCH_MODE="',
    'if exist "%SCRIPT_DIR%\\bundle\\server.bundle.cjs" if exist "%SCRIPT_DIR%\\dist\\index.html" (',
    '    set "LAUNCH_MODE=BUNDLE"',
    '    echo   [OK] الحزمة المستقلة جاهزة (bundle\\server.bundle.cjs + dist) - تشغيل فوري بدون إنترنت.',
    ')',
    'if "%LAUNCH_MODE%"=="" if exist "%SCRIPT_DIR%\\dist\\index.html" if exist "%SCRIPT_DIR%\\node_modules" (',
    '    set "LAUNCH_MODE=DIST_PROD"',
    '    echo   [OK] ملفات الإنتاج والاعتماديات موجودة محلياً - لا حاجة لأي تحميل.',
    ')',
    'if "%LAUNCH_MODE%"=="" (',
    '    if not exist "%SCRIPT_DIR%\\node_modules" (',
    '        echo   [تنبيه] وضع المصدر الخام: تثبيت الاعتماديات المحلية...',
    '        if "%RUNTIME_KIND%"=="bun" (call bun install) else (call npm install)',
    '    )',
    '    if not exist "%SCRIPT_DIR%\\dist\\index.html" (',
    '        echo   [تنبيه] بناء الواجهة محلياً لأول مرة...',
    '        if "%RUNTIME_KIND%"=="bun" (call bun run build) else (call npm run build)',
    '    )',
    '    set "LAUNCH_MODE=DEV_SOURCE"',
    ')',
    '',
    ':: [5/6] إنشاء ملف التشغيل التلقائي واختصارات سطح المكتب',
    'echo [5/6] إنشاء اختصارات سطح المكتب للتشغيل الفوري...',
    'set "RUNNER_BAT=%SCRIPT_DIR%\\تشغيل_حاسب_ERP.bat"',
    '(',
    'echo @echo off',
    'echo chcp 65001 ^>nul',
    `echo title ${appNameAr}`,
    'echo cd /d "%~dp0"',
    'echo set "NODE_ENV=production"',
    `echo set "PORT=${port}"`,
    `echo set "HTTPS_PORT=${httpsPort}"`,
    `echo start "" cmd /c "timeout /t 2 /nobreak ^>nul ^&^& (start msedge.exe --app=http://localhost:${port} --start-maximized 2^>nul ^|^| start chrome.exe --app=http://localhost:${port} --start-maximized 2^>nul ^|^| start http://localhost:${port})"`,
    'if "%LAUNCH_MODE%"=="BUNDLE" (',
    '    echo "%NODE_CMD%" "%~dp0bundle\\server.bundle.cjs"',
    ') else (',
    '    if "%RUNTIME_KIND%"=="bun" (',
    '        echo bun server.ts',
    '    ) else (',
    '        echo call npx tsx server.ts',
    '    )',
    ')',
    ') > "%RUNNER_BAT%"',
    '',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut($desk + '\\تشغيل نظام حاسب المحاسبي.lnk'); $s.TargetPath = '%RUNNER_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = '${appNameAr} - يعمل بدون إنترنت + LAN'; $s.Save()" >nul 2>&1`,
    'echo   [OK] تم إنشاء اختصار سطح المكتب: تشغيل نظام حاسب المحاسبي',
    `echo   [LAN] رابط الدخول من أي جوال أو تابلت على نفس الواي فاي: ${lanHintUrl}`,
    '',
    ':: [6/6] التشغيل الفوري للنظام الآن',
    'echo [6/6] التجهيز مكتمل بنسبة 100%%! جاري تشغيل النظام الآن...',
    'echo.',
    'call "%RUNNER_BAT%"',
  ];

  return lines.join('\r\n');
}

/**
 * Generates the Self-Contained Linux / macOS Setup, Firewall & Android udev Rules Script (.sh).
 */
export function generateLinuxMacSetupSh(options: InstallerScriptOptions = {}): string {
  const port = Number(options.port) || 3000;
  const httpsPort = Number(options.httpsPort) || 3443;
  const appNameAr = options.appNameAr || 'نظام حاسب المحاسبي (Haseb ERP)';

  return [
    '#!/usr/bin/env bash',
    `# ${appNameAr} - Self-Contained Zero-Download Setup, Firewall & USB SMS Permissions`,
    'set -e',
    '',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'cd "$SCRIPT_DIR"',
    '',
    'echo "==============================================================================="',
    `echo "  ${appNameAr} - Zero-Download Self-Contained Installer & Permissions"`,
    'echo "==============================================================================="',
    '',
    '# 1. Detect offline/local runtime',
    'RUNTIME=""',
    'if [ -x "$SCRIPT_DIR/runtime/node" ]; then',
    '  RUNTIME="$SCRIPT_DIR/runtime/node"',
    'elif command -v node >/dev/null 2>&1; then',
    '  RUNTIME="$(command -v node)"',
    'elif command -v bun >/dev/null 2>&1; then',
    '  RUNTIME="$(command -v bun)"',
    'else',
    '  echo "[!] يرجى التأكد من وجود node أو bun لتشغيل النظام."',
    '  exit 1',
    'fi',
    'echo "[OK] محرك التشغيل: $RUNTIME"',
    '',
    '# 2. Configure Firewall (ufw / firewalld) when sudo available',
    'if command -v ufw >/dev/null 2>&1; then',
    `  (sudo -n ufw allow ${port}/tcp && sudo -n ufw allow ${httpsPort}/tcp && sudo -n ufw allow 5037/tcp) >/dev/null 2>&1 || true`,
    `  echo "[OK] تم فحص/تطبيق قواعد UFW للمنافذ ${port} و ${httpsPort}."`,
    'elif command -v firewall-cmd >/dev/null 2>&1; then',
    `  (sudo -n firewall-cmd --permanent --add-port=${port}/tcp && sudo -n firewall-cmd --permanent --add-port=${httpsPort}/tcp && sudo -n firewall-cmd --reload) >/dev/null 2>&1 || true`,
    `  echo "[OK] تم فحص/تطبيق قواعد firewalld للمنافذ ${port} و ${httpsPort}."`,
    'fi',
    '',
    '# 3. Configure Linux Android USB udev rules (Plug & Play without root)',
    'if [ "$(uname -s)" = "Linux" ] && [ -d /etc/udev/rules.d ]; then',
    '  UDEV_CONTENT="# Haseb ERP Android & USB Serial SMS Bridge Rules',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"04e8\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"2717\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"12d1\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"22d9\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"2d95\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"18d1\\", MODE=\\"0666\\", GROUP=\\"plugdev\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"1a86\\", MODE=\\"0666\\", GROUP=\\"dialout\\"',
    'SUBSYSTEM==\\"usb\\", ATTR{idVendor}==\\"10c4\\", MODE=\\"0666\\", GROUP=\\"dialout\\""',
    '  echo "$UDEV_CONTENT" | sudo -n tee /etc/udev/rules.d/51-haseb-android.rules >/dev/null 2>&1 && (sudo -n udevadm control --reload-rules && sudo -n udevadm trigger) >/dev/null 2>&1 || true',
    'fi',
    '',
    '# 4. Start ADB server if present',
    'if command -v adb >/dev/null 2>&1; then',
    '  adb start-server >/dev/null 2>&1 || true',
    '  echo "[OK] خادم ADB جاهز للتعرف التلقائي على كابل الجوال."',
    'fi',
    '',
    '# 5. Create quick zero-download runner script',
    'cat << \'RUNNER_EOF\' > "$SCRIPT_DIR/run_haseb_erp.sh"',
    '#!/usr/bin/env bash',
    'DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'cd "$DIR"',
    'export NODE_ENV=production',
    `export PORT=\${PORT:-${port}}`,
    `export HTTPS_PORT=\${HTTPS_PORT:-${httpsPort}}`,
    'if command -v xdg-open >/dev/null 2>&1; then',
    '  (sleep 2 && xdg-open "http://localhost:$PORT") &',
    'elif command -v open >/dev/null 2>&1; then',
    '  (sleep 2 && open "http://localhost:$PORT") &',
    'fi',
    'if [ -f "$DIR/bundle/server.bundle.cjs" ] && [ -f "$DIR/dist/index.html" ]; then',
    '  exec node "$DIR/bundle/server.bundle.cjs"',
    'elif command -v bun >/dev/null 2>&1; then',
    '  exec bun "$DIR/server.ts"',
    'else',
    '  exec npx tsx "$DIR/server.ts"',
    'fi',
    'RUNNER_EOF',
    'chmod +x "$SCRIPT_DIR/run_haseb_erp.sh"',
    '',
    '# 6. Build only if neither prebuilt bundle nor dist exists',
    'if [ ! -f "$SCRIPT_DIR/dist/index.html" ] || [ ! -f "$SCRIPT_DIR/bundle/server.bundle.cjs" ]; then',
    '  if [ ! -d "$SCRIPT_DIR/node_modules" ]; then',
    '    npm install',
    '  fi',
    '  npm run build || true',
    'fi',
    '',
    'echo "[OK] تم التجهيز بالكامل! جاري تشغيل النظام الآن..."',
    'exec "$SCRIPT_DIR/run_haseb_erp.sh"',
  ].join('\n');
}

/**
 * Generates clear Arabic setup instructions included inside the offline portable ZIP bundle.
 */
export function generatePortableReadmeAr(options: InstallerScriptOptions = {}): string {
  const port = Number(options.port) || 3000;
  return [
    '====================================================================',
    '  نظام حاسب المحاسبي المتكامل (Haseb ERP) - حزمة التشغيل بدون إنترنت',
    '====================================================================',
    '',
    '1) محتويات هذه الحزمة جاهزة للعمل الفوري بدون تحميل اعتماديات:',
    '   - dist/                    : ملفات الواجهة المترجمة بالكامل',
    '   - bundle/server.bundle.cjs : الخادم المدمج بدون الحاجة لـ node_modules',
    '   - installer_windows.bat    : ملف التسطيب التلقائي لويندوز',
    '   - installer_linux_mac.sh   : ملف التسطيب لأنظمة Linux و Mac',
    '',
    '2) طريقة التشغيل على Windows:',
    '   - فك الضغط في أي مجلد (مثلاً C:\\HasebERP).',
    '   - انقر نقراً مزدوجاً على ملف: installer_windows.bat',
    '   - سيطلب صلاحية المسؤول تلقائياً ليقوم بـ:',
    `     * فتح جدار الحماية للمنافذ ${port} و 3443 و 5037`,
    '     * تفعيل صلاحيات الشبكة المحلية LAN للربط مع الجوالات',
    '     * تشغيل خدمة ADB للتعرف الفوري على جوال SMS بمجرد توصيل السلك',
    '     * إنشاء اختصار مباشر على سطح المكتب وفتح البرنامج فوراً.',
    '',
    '3) تفعيل جسر رسائل SMS عبر كابل USB:',
    '   - على جوال الأندرويد: فعّل "خيارات المطور" ثم "تصحيح أخطاء USB (USB Debugging)".',
    '   - (لهواتف شاومي/ريدمي/بوكو: فعّل أيضاً خيار "تصحيح USB - إعدادات الأمان").',
    '   - وصّل السلك بالجهاز وسيظهر الجوال تلقائياً في تبويب "خدمات التواصل -> جسر SMS".',
    '   - أو صل أي مودم USB GSM وسيتعرف على منفذ COM / ttyUSB تلقائياً.',
  ].join('\r\n');
}

// ============================================================================
// Pure In-Memory ZIP (STORE) Archive Generator (Zero External Zip Binaries)
// ============================================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a valid standard PKZIP archive buffer in pure TypeScript using STORE (method 0)
 * so any Windows Explorer / macOS Archive Utility / unzip CLI extracts it cleanly.
 */
export function createStoredZipBuffer(entries: ZipEntryInput[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const cleanName = entry.name.replace(/^\/+/, '').replace(/\\/g, '/');
    const nameBuf = Buffer.from(cleanName, 'utf8');
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = computeCrc32(dataBuf);
    const size = dataBuf.length;

    // Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(0, 8); // Compression method 0 (STORE)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length

    localParts.push(localHeader, nameBuf, dataBuf);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(0, 10); // Method 0 (STORE)
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra length
    centralHeader.writeUInt16LE(0, 32); // Comment length
    centralHeader.writeUInt16LE(0, 34); // Disk start
    centralHeader.writeUInt16LE(0, 36); // Internal attrs
    centralHeader.writeUInt32LE(0, 38); // External attrs
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}
