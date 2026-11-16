/**
 * Builds the zero-download offline portable bundle for Haseb ERP:
 * 1. Compiles standalone_server.ts into bundle/server.bundle.cjs (CJS, zero runtime node_modules).
 * 2. Syncs installer_windows.bat and installer_linux_mac.sh with UAC/Firewall/ADB setup.
 */

import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';
import {
  generateLinuxMacSetupSh,
  generatePortableReadmeAr,
  generateWindowsSetupBat,
} from '../src/core/installerEngine';

async function main() {
  const rootDir = process.cwd();
  const bundleDir = path.join(rootDir, 'bundle');
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  const outFile = path.join(bundleDir, 'server.bundle.cjs');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'standalone_server.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: ['node20'],
    outfile: outFile,
    minify: false,
    logLevel: 'info',
  });

  fs.writeFileSync(
    path.join(rootDir, 'installer_windows.bat'),
    generateWindowsSetupBat({ port: 3000, httpsPort: 3443 }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(rootDir, 'installer_linux_mac.sh'),
    generateLinuxMacSetupSh({ port: 3000, httpsPort: 3443 }),
    'utf8'
  );
  fs.chmodSync(path.join(rootDir, 'installer_linux_mac.sh'), 0o755);
  fs.writeFileSync(
    path.join(bundleDir, 'README_SETUP_AR.txt'),
    generatePortableReadmeAr({ port: 3000, httpsPort: 3443 }),
    'utf8'
  );

  const stat = fs.statSync(outFile);
  console.log(
    `[Portable Bundle] Built ${outFile} (${(stat.size / 1024).toFixed(1)} KB) + installers ready.`
  );
}

main().catch((err) => {
  console.error('[Portable Bundle] Build failed:', err);
  process.exit(1);
});
