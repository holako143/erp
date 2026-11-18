/**
 * Haseb Enterprise ERP - Native Windows Standalone Executable (.exe) Entry
 * Self-contained single-binary installer & launcher (zero Node.js / Bun / npm required):
 * 1. Extracts embedded production frontend (dist/) to %LOCALAPPDATA%\HasebERP
 * 2. Registers Desktop & Start Menu shortcuts to HasebERP.exe
 * 3. Performs one-time UAC elevation to open Windows Defender Firewall ports (3000, 3443, 5037)
 *    & HTTP URL ACLs so LAN mobiles and tablets connect immediately
 * 4. Starts ADB USB bridge daemon for plug-and-play Android SMS dispatch
 * 5. Starts full unified ERP server (SQLite WAL + LAN WebSocket + HTTPS + WhatsApp + USB SMS)
 * 6. Opens frameless desktop POS/ERP app window automatically
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { execFile, execFileSync, spawn } from 'child_process';
import { EMBEDDED_DIST_ASSETS } from './bundle/embeddedDistAssets';
import {
  generatePortableReadmeAr,
  generateWindowsSetupBat,
} from './src/core/installerEngine';
import {
  ensureAdbDaemonStartedAsync,
  getLanIpv4Addresses,
  resolveAdbExecutablePathAsync,
} from './src/server/usbAndInstallerHost';

const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;

function resolveInstallHome(): string {
  if (process.env.HASEB_HOME) return process.env.HASEB_HOME;
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(base, 'HasebERP');
  }
  return path.join(os.homedir(), 'HasebERP');
}

function extractEmbeddedDistToDisk(distDir: string): number {
  const keys = Object.keys(EMBEDDED_DIST_ASSETS);
  if (keys.length === 0) return 0;

  let written = 0;
  for (const relPath of keys) {
    const safeRel = relPath.replace(/^\/+/, '').replace(/\.\./g, '');
    const targetFile = path.join(distDir, safeRel);
    const targetParent = path.dirname(targetFile);
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }
    const meta = EMBEDDED_DIST_ASSETS[relPath];
    const buf = zlib.gunzipSync(Buffer.from(meta.gzB64, 'base64'));
    const needsWrite =
      !fs.existsSync(targetFile) || fs.statSync(targetFile).size !== buf.length;
    if (needsWrite) {
      fs.writeFileSync(targetFile, buf);
      written += 1;
    }
  }
  return written;
}

function setupWindowsHostEnvironment(installHome: string): string {
  const targetExe = path.join(installHome, 'HasebERP.exe');
  try {
    if (
      path.extname(process.execPath).toLowerCase() === '.exe' &&
      path.resolve(process.execPath).toLowerCase() !== path.resolve(targetExe).toLowerCase()
    ) {
      fs.copyFileSync(process.execPath, targetExe);
    }
  } catch {
    // Non-fatal if currently locked
  }

  const exeToPin = fs.existsSync(targetExe) ? targetExe : process.execPath;

  // Write reference scripts & README
  try {
    const lanIps = getLanIpv4Addresses();
    fs.writeFileSync(
      path.join(installHome, 'installer_windows.bat'),
      generateWindowsSetupBat({ port: PORT, httpsPort: HTTPS_PORT, primaryLanIp: lanIps[0] || '' }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(installHome, 'README_SETUP_AR.txt'),
      generatePortableReadmeAr({ port: PORT, httpsPort: HTTPS_PORT }),
      'utf8'
    );
  } catch {}

  // Create Desktop & Start Menu shortcuts (non-blocking)
  try {
    const escapedTarget = exeToPin.replace(/'/g, "''");
    const escapedHome = installHome.replace(/'/g, "''");
    const shortcutPs = [
      `$ws = New-Object -ComObject WScript.Shell;`,
      `$desk = [Environment]::GetFolderPath('Desktop');`,
      `$s1 = $ws.CreateShortcut($desk + '\\تشغيل نظام حاسب المحاسبي.lnk');`,
      `$s1.TargetPath = '${escapedTarget}';`,
      `$s1.WorkingDirectory = '${escapedHome}';`,
      `$s1.Description = 'نظام حاسب المحاسبي المتكامل (Haseb ERP)';`,
      `$s1.Save();`,
      `$prog = [Environment]::GetFolderPath('Programs');`,
      `$s2 = $ws.CreateShortcut($prog + '\\نظام حاسب المحاسبي.lnk');`,
      `$s2.TargetPath = '${escapedTarget}';`,
      `$s2.WorkingDirectory = '${escapedHome}';`,
      `$s2.Save();`,
    ].join(' ');
    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', shortcutPs],
      { windowsHide: true, timeout: 5000 },
      () => {}
    );
  } catch {}

  // One-time Windows Defender Firewall & URL ACL setup if rule doesn't exist yet
  try {
    const fwCheck = execFileSync(
      'netsh',
      ['advfirewall', 'firewall', 'show', 'rule', `name=Haseb ERP HTTP (${PORT})`],
      { encoding: 'utf8', timeout: 2500, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    if (fwCheck && /Haseb ERP HTTP/i.test(fwCheck) && /Yes|نعم/i.test(fwCheck)) {
      return exeToPin;
    }
  } catch {
    // Rule not configured yet -> trigger single-time UAC elevation
  }

  try {
    const fwScriptPath = path.join(installHome, 'apply_firewall_once.ps1');
    const escapedProgram = exeToPin.replace(/'/g, "''");
    const scriptBody = [
      `netsh advfirewall firewall delete rule name="Haseb ERP HTTP (${PORT})" | Out-Null`,
      `netsh advfirewall firewall delete rule name="Haseb ERP HTTPS (${HTTPS_PORT})" | Out-Null`,
      `netsh advfirewall firewall delete rule name="Haseb ERP ADB Bridge (5037)" | Out-Null`,
      `netsh advfirewall firewall add rule name="Haseb ERP HTTP (${PORT})" dir=in action=allow protocol=TCP localport=${PORT} profile=any | Out-Null`,
      `netsh advfirewall firewall add rule name="Haseb ERP HTTP (${PORT}) Out" dir=out action=allow protocol=TCP localport=${PORT} profile=any | Out-Null`,
      `netsh advfirewall firewall add rule name="Haseb ERP HTTPS (${HTTPS_PORT})" dir=in action=allow protocol=TCP localport=${HTTPS_PORT} profile=any | Out-Null`,
      `netsh advfirewall firewall add rule name="Haseb ERP ADB Bridge (5037)" dir=in action=allow protocol=TCP localport=5037 profile=any | Out-Null`,
      `netsh advfirewall firewall add rule name="Haseb ERP Executable" dir=in action=allow program="${escapedProgram}" enable=yes profile=any | Out-Null`,
      `netsh http add urlacl url=http://+:${PORT}/ user=Everyone | Out-Null`,
      `netsh http add urlacl url=https://+:${HTTPS_PORT}/ user=Everyone | Out-Null`,
    ].join('\r\n');
    fs.writeFileSync(fwScriptPath, scriptBody, 'utf8');

    const elevCmd = `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${fwScriptPath.replace(/'/g, "''")}"' -Verb RunAs -WindowStyle Hidden -Wait`;
    execFileSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', elevCmd],
      { timeout: 25000, windowsHide: true, stdio: 'ignore' }
    );
  } catch {
    // User declined UAC or non-admin session: HTTP on localhost still works immediately
  }

  return exeToPin;
}

function launchDesktopAppWindow(url: string): void {
  if (process.platform === 'win32') {
    const browserCandidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    const foundBrowser = browserCandidates.find((p) => fs.existsSync(p));
    if (foundBrowser) {
      try {
        const child = spawn(foundBrowser, [`--app=${url}`, '--start-maximized'], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return;
      } catch {}
    }
    try {
      const child = spawn('cmd', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    } catch {}
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

async function bootstrapNativeExe() {
  const installHome = resolveInstallHome();
  const distDir = path.join(installHome, 'dist');
  const dataDir = path.join(installHome, '.data');

  fs.mkdirSync(installHome, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  console.log('===============================================================================');
  console.log('  نظام حاسب المحاسبي المتكامل (Haseb ERP) — التشغيل المحلي المستقل');
  console.log('===============================================================================');

  const writtenCount = extractEmbeddedDistToDisk(distDir);
  if (writtenCount > 0) {
    console.log(`[Installer] تم تجهيز ${writtenCount} ملف من واجهة النظام في: ${installHome}`);
  }

  if (process.platform === 'win32') {
    setupWindowsHostEnvironment(installHome);
  }

  // Configure runtime environment BEFORE dynamically loading server.ts
  process.env.NODE_ENV = 'production';
  process.env.HASEB_DEFER_AUTOSTART = '1';
  process.env.HASEB_ROOT_DIR = installHome;
  process.env.HASEB_DIST_DIR = distDir;
  process.env.HASEB_DATA_DIR = dataDir;

  // Pre-warm ADB daemon in background for instant Android USB SMS plug-and-play
  resolveAdbExecutablePathAsync(installHome)
    .then((adbBin) => (adbBin ? ensureAdbDaemonStartedAsync(adbBin) : false))
    .catch(() => {});

  const { startServer } = await import('./server');
  await startServer({
    embeddedAssets: EMBEDDED_DIST_ASSETS,
    onListening: ({ port }) => {
      const lanIps = getLanIpv4Addresses();
      const localUrl = `http://localhost:${port}`;
      console.log(`[Ready] الرابط المحلي الفوري: ${localUrl}`);
      if (lanIps.length > 0) {
        console.log(`[LAN] رابط الجوالات والأجهزة عبر الشبكة: http://${lanIps[0]}:${port}`);
      }
      if (process.env.HASEB_NO_BROWSER !== '1') {
        setTimeout(() => launchDesktopAppWindow(localUrl), 350);
      }
    },
  });
}

bootstrapNativeExe().catch((err) => {
  console.error('[Haseb ERP Fatal Startup Error]', err);
  process.exit(1);
});
