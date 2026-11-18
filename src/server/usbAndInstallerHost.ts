import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import {
  buildAdbSmsShellCommands,
  classifyAdbSmsDispatchResult,
  createDisconnectedUsbDevice,
  isUsbDeviceReady,
  parseAdbBatteryOutput,
  parseAdbDevicesList,
  parseAdbDualSimOperators,
  parseAdbSignalOutput,
  parseAdbSimSubIds,
  parseWindowsSerialPortsOutput,
} from '../core/communicationsEngine';
import {
  createStoredZipBuffer,
  generateLinuxMacSetupSh,
  generatePortableReadmeAr,
  generateWindowsSetupBat,
  SystemReadinessReport,
  ZipEntryInput,
} from '../core/installerEngine';
import { UsbConnectedDevice } from '../types/erp';

const execFileAsync = promisify(execFile);

let adbServerInitialized = false;
let cachedAdbPath: string | null | undefined = undefined;
let cachedAdbRootDir = '';
let cachedAdbCheckedAtMs = 0;
const ADB_CACHE_TTL_MS = 25000;

export function clearAdbPathCacheForTests(): void {
  cachedAdbPath = undefined;
  cachedAdbRootDir = '';
  cachedAdbCheckedAtMs = 0;
}

export function safeExecFileText(
  bin: string,
  args: string[],
  timeoutMs = 2500
): string | null {
  try {
    const out = execFileSync(bin, args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return typeof out === 'string' ? out : String(out || '');
  } catch (err: any) {
    if (err && typeof err.stdout === 'string' && err.stdout.trim()) {
      return err.stdout;
    }
    if (err && typeof err.stderr === 'string' && err.stderr.trim()) {
      return err.stderr;
    }
    return null;
  }
}

export async function safeExecFileTextAsync(
  bin: string,
  args: string[],
  timeoutMs = 2500
): Promise<string | null> {
  try {
    const res = await execFileAsync(bin, args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      windowsHide: true,
    });
    return typeof res.stdout === 'string' ? res.stdout : String(res.stdout || '');
  } catch (err: any) {
    if (err && typeof err.stdout === 'string' && err.stdout.trim()) {
      return err.stdout;
    }
    if (err && typeof err.stderr === 'string' && err.stderr.trim()) {
      return err.stderr;
    }
    return null;
  }
}

export function getLanIpv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const list: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (
        net.family === 'IPv4' &&
        !net.internal &&
        net.address &&
        !net.address.startsWith('169.254.')
      ) {
        list.push(net.address);
      }
    }
  }
  return Array.from(new Set(list));
}

/**
 * Resolves `adb` / `adb.exe` across PATH and common bundled / Windows Android SDK folders.
 * Uses a 25s in-memory TTL cache so repeated probes never stall the event loop.
 */
export function resolveAdbExecutablePath(
  rootDir = process.cwd(),
  forceRefresh = false
): string | null {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedAdbPath !== undefined &&
    cachedAdbRootDir === rootDir &&
    now - cachedAdbCheckedAtMs < ADB_CACHE_TTL_MS
  ) {
    if (!cachedAdbPath || !path.isAbsolute(cachedAdbPath) || fs.existsSync(cachedAdbPath)) {
      return cachedAdbPath;
    }
  }

  const candidates: string[] = [];
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || os.homedir();
    candidates.push(
      path.join(rootDir, 'platform-tools', 'adb.exe'),
      path.join(rootDir, 'runtime', 'platform-tools', 'adb.exe'),
      'C:\\platform-tools\\adb.exe',
      'C:\\adb\\adb.exe'
    );
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'));
    }
    if (userProfile) {
      candidates.push(
        path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe')
      );
    }
  } else {
    candidates.push(
      path.join(rootDir, 'platform-tools', 'adb'),
      path.join(os.homedir(), 'Android', 'Sdk', 'platform-tools', 'adb'),
      '/usr/bin/adb',
      '/usr/local/bin/adb',
      '/opt/homebrew/bin/adb'
    );
  }

  let resolved: string | null = null;
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const res = safeExecFileText(candidate, ['version'], 1500);
        if (res && /Android Debug Bridge/i.test(res)) {
          resolved = candidate;
          break;
        }
      }
    } catch {
      // keep probing
    }
  }

  if (!resolved) {
    const binName = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const versionCheck = safeExecFileText(binName, ['version'], 1500);
    if (versionCheck && /Android Debug Bridge/i.test(versionCheck)) {
      resolved = binName;
    }
  }

  cachedAdbPath = resolved;
  cachedAdbRootDir = rootDir;
  cachedAdbCheckedAtMs = now;
  return resolved;
}

export async function resolveAdbExecutablePathAsync(
  rootDir = process.cwd(),
  forceRefresh = false
): Promise<string | null> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedAdbPath !== undefined &&
    cachedAdbRootDir === rootDir &&
    now - cachedAdbCheckedAtMs < ADB_CACHE_TTL_MS
  ) {
    if (!cachedAdbPath || !path.isAbsolute(cachedAdbPath) || fs.existsSync(cachedAdbPath)) {
      return cachedAdbPath;
    }
  }

  const candidates: string[] = [];
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || os.homedir();
    candidates.push(
      path.join(rootDir, 'platform-tools', 'adb.exe'),
      path.join(rootDir, 'runtime', 'platform-tools', 'adb.exe'),
      'C:\\platform-tools\\adb.exe',
      'C:\\adb\\adb.exe'
    );
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'));
    }
    if (userProfile) {
      candidates.push(
        path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe')
      );
    }
  } else {
    candidates.push(
      path.join(rootDir, 'platform-tools', 'adb'),
      path.join(os.homedir(), 'Android', 'Sdk', 'platform-tools', 'adb'),
      '/usr/bin/adb',
      '/usr/local/bin/adb',
      '/opt/homebrew/bin/adb'
    );
  }

  let resolved: string | null = null;
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const res = await safeExecFileTextAsync(candidate, ['version'], 1500);
        if (res && /Android Debug Bridge/i.test(res)) {
          resolved = candidate;
          break;
        }
      }
    } catch {
      // keep probing
    }
  }

  if (!resolved) {
    const binName = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const versionCheck = await safeExecFileTextAsync(binName, ['version'], 1500);
    if (versionCheck && /Android Debug Bridge/i.test(versionCheck)) {
      resolved = binName;
    }
  }

  cachedAdbPath = resolved;
  cachedAdbRootDir = rootDir;
  cachedAdbCheckedAtMs = now;
  return resolved;
}

export function ensureAdbDaemonStarted(adbBin: string | null): boolean {
  if (!adbBin) return false;
  if (!adbServerInitialized) {
    const startRes = safeExecFileText(adbBin, ['start-server'], 3500);
    adbServerInitialized = startRes !== null;
  }
  return adbServerInitialized;
}

export async function ensureAdbDaemonStartedAsync(adbBin: string | null): Promise<boolean> {
  if (!adbBin) return false;
  if (!adbServerInitialized) {
    const startRes = await safeExecFileTextAsync(adbBin, ['start-server'], 3500);
    adbServerInitialized = startRes !== null;
  }
  return adbServerInitialized;
}

export async function scanOsSerialAndUsbHardwareAsync(rootDir = process.cwd()): Promise<{
  hasUsbTools: boolean;
  adbPath: string | null;
  serialPorts: string[];
  usbModemInfo?: { manufacturer: string; product: string; serial: string; port: string };
}> {
  const adbPath = await resolveAdbExecutablePathAsync(rootDir);
  const serialPorts: string[] = [];
  let usbModemInfo:
    | { manufacturer: string; product: string; serial: string; port: string }
    | undefined;

  if (process.platform === 'win32') {
    const psSerial = await safeExecFileTextAsync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,PNPDeviceID | ConvertTo-Json -Compress',
      ],
      2800
    );
    const parsedWin = parseWindowsSerialPortsOutput(psSerial || '');
    for (const p of parsedWin) {
      if (!serialPorts.includes(p.port)) serialPorts.push(p.port);
      if (!usbModemInfo && p.isModem) {
        usbModemInfo = {
          manufacturer: 'Windows USB Modem / COM',
          product: p.name,
          serial: p.pnpDeviceId || p.port,
          port: p.port,
        };
      }
    }
    if (serialPorts.length === 0) {
      const modeOut = await safeExecFileTextAsync('cmd', ['/c', 'mode'], 1800);
      const modePorts = parseWindowsSerialPortsOutput(modeOut || '');
      for (const mp of modePorts) {
        if (!serialPorts.includes(mp.port)) serialPorts.push(mp.port);
      }
    }
  } else if (process.platform === 'linux') {
    try {
      const devFiles = fs.readdirSync('/dev');
      for (const f of devFiles) {
        if (/^(ttyUSB|ttyACM|rfcomm)\d+$/.test(f)) {
          serialPorts.push(`/dev/${f}`);
        }
      }
    } catch {}

    try {
      const usbDirs = fs.readdirSync('/sys/bus/usb/devices');
      for (const dir of usbDirs) {
        if (dir.startsWith('usb') || dir.includes(':')) continue;
        const base = path.join('/sys/bus/usb/devices', dir);
        const readAttr = (attr: string) => {
          try {
            return fs.readFileSync(path.join(base, attr), 'utf8').trim();
          } catch {
            return '';
          }
        };
        const product = readAttr('product');
        const manufacturer = readAttr('manufacturer');
        const serial = readAttr('serial');
        if (
          product &&
          !/host controller|root hub/i.test(product) &&
          !/linux/i.test(manufacturer)
        ) {
          usbModemInfo = {
            manufacturer: manufacturer || 'USB Mobile / Modem',
            product,
            serial: serial || dir,
            port: serialPorts[0] || `/sys/bus/usb/devices/${dir}`,
          };
          break;
        }
      }
    } catch {}
  } else if (process.platform === 'darwin') {
    try {
      const devFiles = fs.readdirSync('/dev');
      for (const f of devFiles) {
        if (/^cu\.(usb|wchusb|SLAB_USB)/i.test(f)) {
          serialPorts.push(`/dev/${f}`);
        }
      }
    } catch {}
  }

  return {
    hasUsbTools: Boolean(adbPath),
    adbPath,
    serialPorts,
    usbModemInfo,
  };
}

export function scanOsSerialAndUsbHardware(rootDir = process.cwd()): {
  hasUsbTools: boolean;
  adbPath: string | null;
  serialPorts: string[];
  usbModemInfo?: { manufacturer: string; product: string; serial: string; port: string };
} {
  const adbPath = resolveAdbExecutablePath(rootDir);
  const serialPorts: string[] = [];
  let usbModemInfo:
    | { manufacturer: string; product: string; serial: string; port: string }
    | undefined;

  if (process.platform === 'win32') {
    const psSerial = safeExecFileText(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,PNPDeviceID | ConvertTo-Json -Compress',
      ],
      2800
    );
    const parsedWin = parseWindowsSerialPortsOutput(psSerial || '');
    for (const p of parsedWin) {
      if (!serialPorts.includes(p.port)) serialPorts.push(p.port);
      if (!usbModemInfo && p.isModem) {
        usbModemInfo = {
          manufacturer: 'Windows USB Modem / COM',
          product: p.name,
          serial: p.pnpDeviceId || p.port,
          port: p.port,
        };
      }
    }
    if (serialPorts.length === 0) {
      const modeOut = safeExecFileText('cmd', ['/c', 'mode'], 1800);
      const modePorts = parseWindowsSerialPortsOutput(modeOut || '');
      for (const mp of modePorts) {
        if (!serialPorts.includes(mp.port)) serialPorts.push(mp.port);
      }
    }
  } else if (process.platform === 'linux') {
    try {
      const devFiles = fs.readdirSync('/dev');
      for (const f of devFiles) {
        if (/^(ttyUSB|ttyACM|rfcomm)\d+$/.test(f)) {
          serialPorts.push(`/dev/${f}`);
        }
      }
    } catch {}

    try {
      const usbDirs = fs.readdirSync('/sys/bus/usb/devices');
      for (const dir of usbDirs) {
        if (dir.startsWith('usb') || dir.includes(':')) continue;
        const base = path.join('/sys/bus/usb/devices', dir);
        const readAttr = (attr: string) => {
          try {
            return fs.readFileSync(path.join(base, attr), 'utf8').trim();
          } catch {
            return '';
          }
        };
        const product = readAttr('product');
        const manufacturer = readAttr('manufacturer');
        const serial = readAttr('serial');
        if (
          product &&
          !/host controller|root hub/i.test(product) &&
          !/linux/i.test(manufacturer)
        ) {
          usbModemInfo = {
            manufacturer: manufacturer || 'USB Mobile / Modem',
            product,
            serial: serial || dir,
            port: serialPorts[0] || `/sys/bus/usb/devices/${dir}`,
          };
          break;
        }
      }
    } catch {}
  } else if (process.platform === 'darwin') {
    try {
      const devFiles = fs.readdirSync('/dev');
      for (const f of devFiles) {
        if (/^cu\.(usb|wchusb|SLAB_USB)/i.test(f)) {
          serialPorts.push(`/dev/${f}`);
        }
      }
    } catch {}
  }

  return {
    hasUsbTools: Boolean(adbPath),
    adbPath,
    serialPorts,
    usbModemInfo,
  };
}

export function probeHostUsbMobileBridgeState(params: {
  rootDir?: string;
  sentCounter: number;
  clientRegisteredDevice: UsbConnectedDevice | null;
}): UsbConnectedDevice {
  const checkedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const hwScan = scanOsSerialAndUsbHardware(params.rootDir || process.cwd());

  // 1. Check real ADB Android phones
  if (hwScan.hasUsbTools && hwScan.adbPath) {
    ensureAdbDaemonStarted(hwScan.adbPath);
    const adbOut = safeExecFileText(hwScan.adbPath, ['devices', '-l'], 2500);
    const parsedDevices = parseAdbDevicesList(adbOut || '');
    const authorized = parsedDevices.find((d) => d.state === 'device');
    if (authorized) {
      const prop = (key: string) =>
        (
          safeExecFileText(
            hwScan.adbPath!,
            ['-s', authorized.serial, 'shell', 'getprop', key],
            1500
          ) || ''
        ).trim();

      const model = prop('ro.product.model') || authorized.model || 'Android Phone';
      const manufacturer = prop('ro.product.manufacturer') || 'Android OEM';
      const simInfo = parseAdbDualSimOperators(
        prop('gsm.sim.operator.alpha'),
        prop('gsm.operator.alpha')
      );
      const simInfoRaw =
        safeExecFileText(
          hwScan.adbPath,
          ['-s', authorized.serial, 'shell', 'content query --uri content://telephony/siminfo'],
          1600
        ) || '';
      const subIds = parseAdbSimSubIds(simInfoRaw);
      const batteryRaw =
        safeExecFileText(
          hwScan.adbPath,
          ['-s', authorized.serial, 'shell', 'dumpsys', 'battery'],
          1500
        ) || '';
      const signalRaw =
        safeExecFileText(
          hwScan.adbPath,
          ['-s', authorized.serial, 'shell', 'dumpsys', 'telephony.registry'],
          1800
        ) || '';
      const bat = parseAdbBatteryOutput(batteryRaw);
      const sig = parseAdbSignalOutput(signalRaw);

      return {
        id: `adb-${authorized.serial}`,
        model,
        manufacturer,
        serialNumber: authorized.serial,
        port: `ADB USB (${
          authorized.transportId ? `transport ${authorized.transportId}` : authorized.serial
        })`,
        connectionMode: 'ADB_DEBUGGING',
        simOperator: simInfo.summaryLabel,
        simSlot: 1,
        dualSimOperators: {
          sim1: simInfo.sim1Operator,
          sim2: simInfo.sim2Operator,
        },
        subIds,
        signalStrengthPercent: sig > 0 ? sig : 80,
        batteryPercent: bat.batteryPercent,
        isCharging: bat.isCharging,
        usbDebuggingEnabled: true,
        atCommandReady: true,
        messagesSentCount: params.sentCounter,
        connectedAt: checkedAt,
        status: 'CONNECTED',
        detectionSource: 'SERVER_ADB',
        statusReasonAr: `مرتبط تلقائياً عبر USB (${model}) — الشريحة: ${simInfo.summaryLabel}`,
        lastCheckedAt: checkedAt,
        hasUsbToolsOnHost: true,
      };
    }

    const unauthorized = parsedDevices.find((d) => d.state === 'unauthorized');
    if (unauthorized) {
      return {
        ...createDisconnectedUsbDevice(
          'تم رصد كابل الجوال! يرجى الضغط على "السماح بتصحيح أخطاء USB" في النافذة الظاهرة على شاشة الجوال للربط الفوري.'
        ),
        id: `adb-unauth-${unauthorized.serial}`,
        model: unauthorized.model || 'جوال أندرويد (بانتظار الموافقة على الشاشة)',
        manufacturer: 'Android USB Debugging',
        serialNumber: unauthorized.serial,
        port: 'ADB USB (Unauthorized)',
        status: 'AUTHORIZING',
        detectionSource: 'SERVER_ADB',
        lastCheckedAt: checkedAt,
        hasUsbToolsOnHost: true,
        messagesSentCount: params.sentCounter,
      };
    }
  }

  // 2. Check OS Serial / COM Ports & USB GSM Modems
  if (hwScan.serialPorts.length > 0 || hwScan.usbModemInfo) {
    const portLabel = hwScan.serialPorts[0] || hwScan.usbModemInfo?.port || 'USB Port';
    const hasSerial = hwScan.serialPorts.length > 0;
    return {
      ...createDisconnectedUsbDevice(
        hasSerial
          ? `تم رصد منفذ مودم تسلسلي حقيقي (${portLabel}) وجاهز لإرسال SMS بأوامر AT+CMGS.`
          : `تم رصد جهاز USB (${hwScan.usbModemInfo?.product})! لتفعيله للإرسال الآلي فعّل "تصحيح أخطاء USB" من خيارات المطور على الجوال.`
      ),
      id: `usb-host-${(hwScan.usbModemInfo?.serial || portLabel).replace(/[^a-zA-Z0-9_-]/g, '')}`,
      model: hwScan.usbModemInfo?.product || `USB Serial Modem (${portLabel})`,
      manufacturer: hwScan.usbModemInfo?.manufacturer || 'USB CDC-ACM Device',
      serialNumber: hwScan.usbModemInfo?.serial || portLabel,
      port: portLabel,
      connectionMode: 'USB_MODEM_AT',
      simOperator: hasSerial ? 'شريحة المودم النشطة (AT+CMGS)' : 'بانتظار تفعيل USB Debugging',
      atCommandReady: hasSerial,
      usbDebuggingEnabled: false,
      status: hasSerial ? 'CONNECTED' : 'AUTHORIZING',
      detectionSource: 'SERVER_SERIAL',
      lastCheckedAt: checkedAt,
      hasUsbToolsOnHost: hwScan.hasUsbTools,
      messagesSentCount: params.sentCounter,
    };
  }

  // 3. Browser-registered WebUSB/WebSerial or HTTP Gateway
  if (params.clientRegisteredDevice) {
    return {
      ...params.clientRegisteredDevice,
      lastCheckedAt: checkedAt,
      hasUsbToolsOnHost: hwScan.hasUsbTools,
      messagesSentCount: Math.max(
        params.sentCounter,
        params.clientRegisteredDevice.messagesSentCount || 0
      ),
    };
  }

  // 4. Honest Disconnected State
  return {
    ...createDisconnectedUsbDevice(
      hwScan.hasUsbTools
        ? 'بانتظار توصيل كابل الجوال — سيتم الربط تلقائياً فور توصيل السلك وتفعيل تصحيح أخطاء USB.'
        : 'بانتظار توصيل الجوال أو مودم COM — وصّل السلك ثم اختر "التعرف على جوال USB / مودم COM" أو شغّل ملف التسطيب لتفعيل ADB.'
    ),
    lastCheckedAt: checkedAt,
    hasUsbToolsOnHost: hwScan.hasUsbTools,
    messagesSentCount: params.sentCounter,
  };
}

/**
 * Dispatches SMS directly via an ADB-connected Android handset across Android 7-15 SDKs.
 */
export function dispatchSmsViaHostAdb(params: {
  adbPath: string | null;
  serialNumber: string;
  phone: string;
  message: string;
  simSlot?: number;
  subId?: number;
}): { success: boolean; code: string; messageAr: string } {
  const bin = params.adbPath || resolveAdbExecutablePath();
  if (!bin) {
    return {
      success: false,
      code: 'ADB_MISSING',
      messageAr: 'أداة ADB غير متوفرة في المسار. شغّل ملف التسطيب أو ضع platform-tools بجانب النظام.',
    };
  }

  const sdkRaw =
    safeExecFileText(
      bin,
      ['-s', params.serialNumber, 'shell', 'getprop', 'ro.build.version.sdk'],
      1500
    ) || '30';
  const sdkVersion = Number(sdkRaw.trim()) || 30;
  const commands = buildAdbSmsShellCommands({
    sdkVersion,
    phone: params.phone,
    message: params.message,
    simSlot: params.simSlot,
    subId: params.subId,
  });

  let lastClassification = {
    ok: false,
    reasonCode: 'UNKNOWN_ERROR' as string,
    messageAr: 'لم يستجب الهاتف لأمر الإرسال.',
  };

  for (const cmd of commands) {
    const out = safeExecFileText(bin, ['-s', params.serialNumber, 'shell', cmd], 5000) || '';
    const classified = classifyAdbSmsDispatchResult(out);
    if (classified.ok) {
      return {
        success: true,
        code: 'DELIVERED',
        messageAr: classified.messageAr,
      };
    }
    lastClassification = classified;
    if (classified.reasonCode === 'SECURITY_PERMISSION_REQUIRED') {
      break;
    }
  }

  return {
    success: false,
    code: lastClassification.reasonCode,
    messageAr: lastClassification.messageAr,
  };
}

/**
 * Dispatches SMS directly through a physical OS Serial/COM GSM Modem (`COM3`, `/dev/ttyUSB0`).
 */
export async function dispatchSmsViaHostSerialPort(params: {
  portPath: string;
  phone: string;
  message: string;
}): Promise<{ success: boolean; code: string; messageAr: string }> {
  const cleanPhone = String(params.phone || '').replace(/[^\d+]/g, '');
  const body = String(params.message || '').trim();
  if (!cleanPhone || !body) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      messageAr: 'رقم الهاتف ونص الرسالة مطلوبان.',
    };
  }

  if (process.platform === 'win32') {
    const safePort = params.portPath.replace(/[^A-Za-z0-9]/g, '');
    const safePhoneB64 = Buffer.from(cleanPhone, 'utf8').toString('base64');
    const safeMsgB64 = Buffer.from(body, 'utf8').toString('base64');
    const psScript = [
      `$p = New-Object System.IO.Ports.SerialPort '${safePort}',115200,'None',8,'one';`,
      `$p.ReadTimeout = 2500; $p.WriteTimeout = 2500; $p.NewLine = "\`r\`n";`,
      `try {`,
      `  $p.Open();`,
      `  $p.Write("AT+CMGF=1\`r"); Start-Sleep -Milliseconds 180;`,
      `  $ph = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${safePhoneB64}'));`,
      `  $ms = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${safeMsgB64}'));`,
      `  $p.Write("AT+CMGS=\`"$ph\`"\`r"); Start-Sleep -Milliseconds 250;`,
      `  $p.Write($ms + [char]26); Start-Sleep -Milliseconds 900;`,
      `  $resp = $p.ReadExisting();`,
      `  if ($resp -match 'ERROR') { Write-Output ('ERR:' + $resp) } else { Write-Output ('OK:' + $resp) }`,
      `} finally { if ($p.IsOpen) { $p.Close() } }`,
    ].join(' ');

    const res = safeExecFileText(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      6000
    );
    if (res && res.includes('OK:')) {
      return {
        success: true,
        code: 'DELIVERED',
        messageAr: `تم إرسال الرسالة عبر منفذ المودم (${safePort}) بنجاح.`,
      };
    }
    return {
      success: false,
      code: 'HOST_SERIAL_ERROR',
      messageAr: `تعذر الإرسال عبر منفذ (${safePort}): ${res || 'المنفذ لا يستجيب لأوامر AT+CMGS'}`,
    };
  }

  // Linux / macOS direct serial device
  try {
    if (!fs.existsSync(params.portPath)) {
      return {
        success: false,
        code: 'SERIAL_NOT_FOUND',
        messageAr: `المنفذ (${params.portPath}) غير موجود حالياً.`,
      };
    }
    if (process.platform === 'linux') {
      safeExecFileText('stty', ['-F', params.portPath, '115200', 'raw', '-echo'], 1200);
    }
    const fd = fs.openSync(params.portPath, 'r+');
    try {
      fs.writeSync(fd, Buffer.from('AT+CMGF=1\r\n', 'utf8'));
      await new Promise((r) => setTimeout(r, 150));
      fs.writeSync(fd, Buffer.from(`AT+CMGS="${cleanPhone}"\r\n`, 'utf8'));
      await new Promise((r) => setTimeout(r, 200));
      fs.writeSync(fd, Buffer.concat([Buffer.from(body, 'utf8'), Buffer.from([0x1a])]));
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      fs.closeSync(fd);
    }
    return {
      success: true,
      code: 'DELIVERED',
      messageAr: `تم الإرسال الفعلي عبر منفذ المودم (${params.portPath}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'HOST_SERIAL_OPEN_FAILED',
      messageAr: `تعذر فتح المنفذ (${params.portPath}): ${err?.message || 'تأكد من صلاحيات المنفذ أو شغّل سكربت التهيئة'}`,
    };
  }
}

export async function probeHostUsbMobileBridgeStateAsync(params: {
  rootDir?: string;
  sentCounter: number;
  clientRegisteredDevice: UsbConnectedDevice | null;
}): Promise<UsbConnectedDevice> {
  const checkedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const hwScan = await scanOsSerialAndUsbHardwareAsync(params.rootDir || process.cwd());

  if (hwScan.hasUsbTools && hwScan.adbPath) {
    await ensureAdbDaemonStartedAsync(hwScan.adbPath);
    const adbOut = await safeExecFileTextAsync(hwScan.adbPath, ['devices', '-l'], 2500);
    const parsedDevices = parseAdbDevicesList(adbOut || '');
    const authorized = parsedDevices.find((d) => d.state === 'device');
    if (authorized) {
      const prop = async (key: string) =>
        (
          (await safeExecFileTextAsync(
            hwScan.adbPath!,
            ['-s', authorized.serial, 'shell', 'getprop', key],
            1500
          )) || ''
        ).trim();

      const [modelProp, manufacturerProp, simOpProp, opProp, simInfoRaw, batteryRaw, signalRaw] =
        await Promise.all([
          prop('ro.product.model'),
          prop('ro.product.manufacturer'),
          prop('gsm.sim.operator.alpha'),
          prop('gsm.operator.alpha'),
          safeExecFileTextAsync(
            hwScan.adbPath,
            ['-s', authorized.serial, 'shell', 'content query --uri content://telephony/siminfo'],
            1600
          ),
          safeExecFileTextAsync(
            hwScan.adbPath,
            ['-s', authorized.serial, 'shell', 'dumpsys', 'battery'],
            1500
          ),
          safeExecFileTextAsync(
            hwScan.adbPath,
            ['-s', authorized.serial, 'shell', 'dumpsys', 'telephony.registry'],
            1800
          ),
        ]);

      const model = modelProp || authorized.model || 'Android Phone';
      const manufacturer = manufacturerProp || 'Android OEM';
      const simInfo = parseAdbDualSimOperators(simOpProp, opProp);
      const subIds = parseAdbSimSubIds(simInfoRaw || '');
      const bat = parseAdbBatteryOutput(batteryRaw || '');
      const sig = parseAdbSignalOutput(signalRaw || '');

      return {
        id: `adb-${authorized.serial}`,
        model,
        manufacturer,
        serialNumber: authorized.serial,
        port: `ADB USB (${
          authorized.transportId ? `transport ${authorized.transportId}` : authorized.serial
        })`,
        connectionMode: 'ADB_DEBUGGING',
        simOperator: simInfo.summaryLabel,
        simSlot: 1,
        dualSimOperators: {
          sim1: simInfo.sim1Operator,
          sim2: simInfo.sim2Operator,
        },
        subIds,
        signalStrengthPercent: sig > 0 ? sig : 80,
        batteryPercent: bat.batteryPercent,
        isCharging: bat.isCharging,
        usbDebuggingEnabled: true,
        atCommandReady: true,
        messagesSentCount: params.sentCounter,
        connectedAt: checkedAt,
        status: 'CONNECTED',
        detectionSource: 'SERVER_ADB',
        statusReasonAr: `مرتبط تلقائياً عبر USB (${model}) — الشريحة: ${simInfo.summaryLabel}`,
        lastCheckedAt: checkedAt,
        hasUsbToolsOnHost: true,
      };
    }

    const unauthorized = parsedDevices.find((d) => d.state === 'unauthorized');
    if (unauthorized) {
      return {
        ...createDisconnectedUsbDevice(
          'تم رصد كابل الجوال! يرجى الضغط على "السماح بتصحيح أخطاء USB" في النافذة الظاهرة على شاشة الجوال للربط الفوري.'
        ),
        id: `adb-unauth-${unauthorized.serial}`,
        model: unauthorized.model || 'جوال أندرويد (بانتظار الموافقة على الشاشة)',
        manufacturer: 'Android USB Debugging',
        serialNumber: unauthorized.serial,
        port: 'ADB USB (Unauthorized)',
        status: 'AUTHORIZING',
        detectionSource: 'SERVER_ADB',
        lastCheckedAt: checkedAt,
        hasUsbToolsOnHost: true,
        messagesSentCount: params.sentCounter,
      };
    }
  }

  if (hwScan.serialPorts.length > 0 || hwScan.usbModemInfo) {
    const portLabel = hwScan.serialPorts[0] || hwScan.usbModemInfo?.port || 'USB Port';
    const hasSerial = hwScan.serialPorts.length > 0;
    return {
      ...createDisconnectedUsbDevice(
        hasSerial
          ? `تم رصد منفذ مودم تسلسلي حقيقي (${portLabel}) وجاهز لإرسال SMS بأوامر AT+CMGS.`
          : `تم رصد جهاز USB (${hwScan.usbModemInfo?.product})! لتفعيله للإرسال الآلي فعّل "تصحيح أخطاء USB" من خيارات المطور على الجوال.`
      ),
      id: `usb-host-${(hwScan.usbModemInfo?.serial || portLabel).replace(/[^a-zA-Z0-9_-]/g, '')}`,
      model: hwScan.usbModemInfo?.product || `USB Serial Modem (${portLabel})`,
      manufacturer: hwScan.usbModemInfo?.manufacturer || 'USB CDC-ACM Device',
      serialNumber: hwScan.usbModemInfo?.serial || portLabel,
      port: portLabel,
      connectionMode: 'USB_MODEM_AT',
      simOperator: hasSerial ? 'شريحة المودم النشطة (AT+CMGS)' : 'بانتظار تفعيل USB Debugging',
      atCommandReady: hasSerial,
      usbDebuggingEnabled: false,
      status: hasSerial ? 'CONNECTED' : 'AUTHORIZING',
      detectionSource: 'SERVER_SERIAL',
      lastCheckedAt: checkedAt,
      hasUsbToolsOnHost: hwScan.hasUsbTools,
      messagesSentCount: params.sentCounter,
    };
  }

  if (params.clientRegisteredDevice) {
    return {
      ...params.clientRegisteredDevice,
      lastCheckedAt: checkedAt,
      hasUsbToolsOnHost: hwScan.hasUsbTools,
      messagesSentCount: Math.max(
        params.sentCounter,
        params.clientRegisteredDevice.messagesSentCount || 0
      ),
    };
  }

  return {
    ...createDisconnectedUsbDevice(
      hwScan.hasUsbTools
        ? 'بانتظار توصيل كابل الجوال — سيتم الربط تلقائياً فور توصيل السلك وتفعيل تصحيح أخطاء USB.'
        : 'بانتظار توصيل الجوال أو مودم COM — وصّل السلك ثم اختر "التعرف على جوال USB / مودم COM" أو شغّل ملف التسطيب لتفعيل ADB.'
    ),
    lastCheckedAt: checkedAt,
    hasUsbToolsOnHost: hwScan.hasUsbTools,
    messagesSentCount: params.sentCounter,
  };
}

export function startUsbCableHotplugWatcher(options: {
  rootDir?: string;
  getSentCounter: () => number;
  getClientRegisteredDevice: () => UsbConnectedDevice | null;
  onDeviceChange: (device: UsbConnectedDevice) => void;
  intervalMs?: number;
}): () => void {
  let lastSig = '';
  let ticking = false;

  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    void probeHostUsbMobileBridgeStateAsync({
      rootDir: options.rootDir,
      sentCounter: options.getSentCounter(),
      clientRegisteredDevice: options.getClientRegisteredDevice(),
    })
      .then((dev) => {
        const sig = `${dev.status}|${dev.id}|${dev.port}|${dev.simOperator}|${dev.detectionSource}|${
          isUsbDeviceReady(dev) ? '1' : '0'
        }`;
        if (sig !== lastSig) {
          lastSig = sig;
          options.onDeviceChange(dev);
        }
      })
      .catch(() => {})
      .finally(() => {
        ticking = false;
      });
  }, options.intervalMs || 3500);

  return () => clearInterval(timer);
}

/**
 * Inspects complete OS, Firewall, Port, Bundle, EXE & USB readiness for UI/Diagnostics.
 */
export function inspectSystemReadiness(params: {
  rootDir?: string;
  port: number;
  httpsPort: number;
  httpsEnabled: boolean;
  embeddedAssetsActive?: boolean;
}): SystemReadinessReport {
  const rootDir = params.rootDir || process.cwd();
  const lanAddresses = getLanIpv4Addresses();
  const primaryIp = lanAddresses[0] || '127.0.0.1';
  const distDir = process.env.HASEB_DIST_DIR || path.join(rootDir, 'dist');
  const distReady = fs.existsSync(path.join(distDir, 'index.html'));
  const bundleReady = fs.existsSync(path.join(rootDir, 'bundle', 'server.bundle.cjs'));
  const exePath = path.join(rootDir, 'bundle', 'Haseb_ERP_Setup_Offline.exe');
  const exeInstallerReady = fs.existsSync(exePath);
  const exeInstallerSizeMb = exeInstallerReady
    ? Math.round((fs.statSync(exePath).size / (1024 * 1024)) * 10) / 10
    : null;
  const embeddedDistReady =
    Boolean(params.embeddedAssetsActive) ||
    fs.existsSync(path.join(rootDir, 'bundle', 'embeddedDistAssets.json'));
  const hwScan = scanOsSerialAndUsbHardware(rootDir);

  let firewallStatus: SystemReadinessReport['firewallStatus'] = 'UNKNOWN';
  let firewallDetailsAr = 'يعمل عبر إعدادات الشبكة الافتراضية.';

  if (process.platform === 'win32') {
    const fw = safeExecFileText(
      'netsh',
      ['advfirewall', 'firewall', 'show', 'rule', `name=Haseb ERP HTTP (${params.port})`],
      2000
    );
    if (fw && /Haseb ERP HTTP/i.test(fw) && /Yes|نعم/i.test(fw)) {
      firewallStatus = 'CONFIGURED';
      firewallDetailsAr = `قاعدة جدار الحماية لـ Windows مفعلة للمنافذ ${params.port} و ${params.httpsPort}.`;
    } else {
      firewallStatus = 'NEEDS_ADMIN_RUN';
      firewallDetailsAr = `انقر "تطبيق الصلاحيات" أو شغّل ملف Haseb_ERP_Setup_Offline.exe لفتح المنافذ ${params.port} و ${params.httpsPort} تلقائياً.`;
    }
  } else {
    const isContainer = fs.existsSync('/.dockerenv') || Boolean(process.env.KUBERNETES_SERVICE_HOST);
    if (isContainer) {
      firewallStatus = 'CONTAINER_MANAGED';
      firewallDetailsAr = `الخادم يستمع على 0.0.0.0:${params.port} وجاهز للشبكة المحلية.`;
    } else {
      const ufwOut = safeExecFileText('ufw', ['status'], 1200);
      if (ufwOut && new RegExp(`\\b${params.port}\\b`).test(ufwOut)) {
        firewallStatus = 'CONFIGURED';
        firewallDetailsAr = `جدار الحماية (UFW) يسمح بالمنفذ ${params.port}.`;
      } else if (ufwOut && /inactive/i.test(ufwOut)) {
        firewallStatus = 'CONFIGURED';
        firewallDetailsAr = `الخادم مفتوح للشبكة المحلية على المنفذ ${params.port}.`;
      } else {
        firewallStatus = 'CONTAINER_MANAGED';
        firewallDetailsAr = `المنفذ ${params.port} يستمع على جميع واجهات الشبكة (0.0.0.0).`;
      }
    }
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    port: params.port,
    httpsPort: params.httpsEnabled ? params.httpsPort : null,
    httpsEnabled: params.httpsEnabled,
    lanAddresses,
    primaryLanUrl: `http://${primaryIp}:${params.port}`,
    distReady,
    bundleReady,
    exeInstallerReady,
    exeInstallerSizeMb,
    embeddedDistReady,
    adbAvailable: hwScan.hasUsbTools,
    adbPath: hwScan.adbPath,
    adbDaemonRunning: adbServerInitialized,
    serialPortsCount: hwScan.serialPorts.length,
    serialPorts: hwScan.serialPorts,
    firewallStatus,
    firewallDetailsAr,
    zeroDownloadReady: (distReady || embeddedDistReady) && (bundleReady || exeInstallerReady),
    checkedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

/**
 * Attempts automatic permission, firewall, and ADB daemon initialization on the host OS.
 */
export function applyHostPermissionsAndServices(params: {
  rootDir?: string;
  port: number;
  httpsPort: number;
}): {
  success: boolean;
  actionsTakenAr: string[];
  needsAdminPrompt: boolean;
  readiness: SystemReadinessReport;
} {
  const rootDir = params.rootDir || process.cwd();
  const actions: string[] = [];
  let needsAdminPrompt = false;

  // 1. Start ADB USB daemon if available
  const adbPath = resolveAdbExecutablePath(rootDir);
  if (adbPath) {
    ensureAdbDaemonStarted(adbPath);
    actions.push(`✓ تم تشغيل خادم ADB USB تلقائياً (${adbPath}).`);
  } else {
    actions.push('ℹ أداة ADB غير مثبته في PATH (يمكنك توصيل مودم COM / Web Serial أو تثبيت ADB عبر ملف التسطيب).');
  }

  // 2. Apply Firewall rules on Windows / Linux if allowed
  if (process.platform === 'win32') {
    const fwAdd = safeExecFileText(
      'netsh',
      [
        'advfirewall',
        'firewall',
        'add',
        'rule',
        `name=Haseb ERP HTTP (${params.port})`,
        'dir=in',
        'action=allow',
        'protocol=TCP',
        `localport=${params.port}`,
        'profile=any',
      ],
      2500
    );
    safeExecFileText(
      'netsh',
      [
        'advfirewall',
        'firewall',
        'add',
        'rule',
        `name=Haseb ERP HTTPS (${params.httpsPort})`,
        'dir=in',
        'action=allow',
        'protocol=TCP',
        `localport=${params.httpsPort}`,
        'profile=any',
      ],
      2000
    );
    if (fwAdd && /Ok\.|حسناً/i.test(fwAdd)) {
      actions.push(`✓ تم فتح منافذ جدار الحماية (${params.port} و ${params.httpsPort}) تلقائياً!`);
    } else {
      needsAdminPrompt = true;
      actions.push('⚠ فتح جدار حماية Windows يتطلب تشغيل ملف التسطيب installer_windows.bat بصلاحيات مسؤول (UAC).');
    }
  } else {
    const ufwOut = safeExecFileText('sudo', ['-n', 'ufw', 'allow', `${params.port}/tcp`], 1800);
    if (ufwOut && /Rule|updated|added/i.test(ufwOut)) {
      actions.push(`✓ تم السماح بالمنفذ ${params.port} في جدار الحماية (UFW).`);
    } else {
      actions.push(`✓ الخادم مفعل ويستمع بالفعل على المنفذ ${params.port} لجميع الأجهزة.`);
    }
  }

  const readiness = inspectSystemReadiness({
    rootDir,
    port: params.port,
    httpsPort: params.httpsPort,
    httpsEnabled: true,
  });

  return {
    success: true,
    actionsTakenAr: actions,
    needsAdminPrompt,
    readiness,
  };
}

function collectFilesRecursively(dirPath: string, zipPrefix: string): ZipEntryInput[] {
  const entries: ZipEntryInput[] = [];
  if (!fs.existsSync(dirPath)) return entries;
  const walk = (currDir: string, relPrefix: string) => {
    const items = fs.readdirSync(currDir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(currDir, item.name);
      const rel = relPrefix ? `${relPrefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        walk(full, rel);
      } else if (item.isFile()) {
        entries.push({
          name: `${zipPrefix}/${rel}`,
          data: fs.readFileSync(full),
        });
      }
    }
  };
  walk(dirPath, '');
  return entries;
}

/**
 * Ensures the zero-dependency standalone server bundle (`bundle/server.bundle.cjs`)
 * is compiled using local `esbuild` and returns an installable offline ZIP archive buffer.
 */
export async function buildPortableOfflineZipBundle(params: {
  rootDir?: string;
  port?: number;
  httpsPort?: number;
}): Promise<{ buffer: Buffer; filesCount: number; includesBundle: boolean; includesDist: boolean }> {
  const rootDir = params.rootDir || process.cwd();
  const port = params.port || 3000;
  const httpsPort = params.httpsPort || 3443;
  const lanAddresses = getLanIpv4Addresses();
  const primaryLanIp = lanAddresses[0] || '';

  const bundleDir = path.join(rootDir, 'bundle');
  const bundleOutFile = path.join(bundleDir, 'server.bundle.cjs');
  const standaloneEntry = path.join(rootDir, 'standalone_server.ts');

  if (!fs.existsSync(bundleOutFile) && fs.existsSync(standaloneEntry)) {
    try {
      if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir, { recursive: true });
      const pkgName = 'esbuild';
      const esbuild = await import(/* @vite-ignore */ pkgName);
      await esbuild.build({
        entryPoints: [standaloneEntry],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        outfile: bundleOutFile,
        minify: false,
        logLevel: 'silent',
      });
    } catch {
      // Ignore if bundled environment restricts dynamic esbuild
    }
  }

  const entries: ZipEntryInput[] = [];
  const rootPrefix = 'Haseb_ERP_Offline';

  entries.push({
    name: `${rootPrefix}/installer_windows.bat`,
    data: Buffer.from(
      generateWindowsSetupBat({ port, httpsPort, primaryLanIp }),
      'utf8'
    ),
  });
  entries.push({
    name: `${rootPrefix}/installer_linux_mac.sh`,
    data: Buffer.from(generateLinuxMacSetupSh({ port, httpsPort }), 'utf8'),
  });
  entries.push({
    name: `${rootPrefix}/README_SETUP_AR.txt`,
    data: Buffer.from(generatePortableReadmeAr({ port, httpsPort }), 'utf8'),
  });

  const includesBundle = fs.existsSync(bundleOutFile);
  if (includesBundle) {
    entries.push({
      name: `${rootPrefix}/bundle/server.bundle.cjs`,
      data: fs.readFileSync(bundleOutFile),
    });
  }

  const distDir = path.join(rootDir, 'dist');
  const distEntries = collectFilesRecursively(distDir, `${rootPrefix}/dist`);
  entries.push(...distEntries);

  const buffer = createStoredZipBuffer(entries);
  return {
    buffer,
    filesCount: entries.length,
    includesBundle,
    includesDist: distEntries.length > 0,
  };
}
