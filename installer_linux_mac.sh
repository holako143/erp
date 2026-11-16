#!/usr/bin/env bash
# نظام حاسب المحاسبي (Haseb ERP) - Self-Contained Zero-Download Setup, Firewall & USB SMS Permissions
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==============================================================================="
echo "  نظام حاسب المحاسبي (Haseb ERP) - Zero-Download Self-Contained Installer & Permissions"
echo "==============================================================================="

# 1. Detect offline/local runtime
RUNTIME=""
if [ -x "$SCRIPT_DIR/runtime/node" ]; then
  RUNTIME="$SCRIPT_DIR/runtime/node"
elif command -v node >/dev/null 2>&1; then
  RUNTIME="$(command -v node)"
elif command -v bun >/dev/null 2>&1; then
  RUNTIME="$(command -v bun)"
else
  echo "[!] يرجى التأكد من وجود node أو bun لتشغيل النظام."
  exit 1
fi
echo "[OK] محرك التشغيل: $RUNTIME"

# 2. Configure Firewall (ufw / firewalld) when sudo available
if command -v ufw >/dev/null 2>&1; then
  (sudo -n ufw allow 3000/tcp && sudo -n ufw allow 3443/tcp && sudo -n ufw allow 5037/tcp) >/dev/null 2>&1 || true
  echo "[OK] تم فحص/تطبيق قواعد UFW للمنافذ 3000 و 3443."
elif command -v firewall-cmd >/dev/null 2>&1; then
  (sudo -n firewall-cmd --permanent --add-port=3000/tcp && sudo -n firewall-cmd --permanent --add-port=3443/tcp && sudo -n firewall-cmd --reload) >/dev/null 2>&1 || true
  echo "[OK] تم فحص/تطبيق قواعد firewalld للمنافذ 3000 و 3443."
fi

# 3. Configure Linux Android USB udev rules (Plug & Play without root)
if [ "$(uname -s)" = "Linux" ] && [ -d /etc/udev/rules.d ]; then
  UDEV_CONTENT="# Haseb ERP Android & USB Serial SMS Bridge Rules
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"04e8\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"2717\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"12d1\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"22d9\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"2d95\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"18d1\", MODE=\"0666\", GROUP=\"plugdev\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"1a86\", MODE=\"0666\", GROUP=\"dialout\"
SUBSYSTEM==\"usb\", ATTR{idVendor}==\"10c4\", MODE=\"0666\", GROUP=\"dialout\""
  echo "$UDEV_CONTENT" | sudo -n tee /etc/udev/rules.d/51-haseb-android.rules >/dev/null 2>&1 && (sudo -n udevadm control --reload-rules && sudo -n udevadm trigger) >/dev/null 2>&1 || true
fi

# 4. Start ADB server if present
if command -v adb >/dev/null 2>&1; then
  adb start-server >/dev/null 2>&1 || true
  echo "[OK] خادم ADB جاهز للتعرف التلقائي على كابل الجوال."
fi

# 5. Create quick zero-download runner script
cat << 'RUNNER_EOF' > "$SCRIPT_DIR/run_haseb_erp.sh"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
export NODE_ENV=production
export PORT=${PORT:-3000}
export HTTPS_PORT=${HTTPS_PORT:-3443}
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:$PORT") &
elif command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://localhost:$PORT") &
fi
if [ -f "$DIR/bundle/server.bundle.cjs" ] && [ -f "$DIR/dist/index.html" ]; then
  exec node "$DIR/bundle/server.bundle.cjs"
elif command -v bun >/dev/null 2>&1; then
  exec bun "$DIR/server.ts"
else
  exec npx tsx "$DIR/server.ts"
fi
RUNNER_EOF
chmod +x "$SCRIPT_DIR/run_haseb_erp.sh"

# 6. Build only if neither prebuilt bundle nor dist exists
if [ ! -f "$SCRIPT_DIR/dist/index.html" ] || [ ! -f "$SCRIPT_DIR/bundle/server.bundle.cjs" ]; then
  if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    npm install
  fi
  npm run build || true
fi

echo "[OK] تم التجهيز بالكامل! جاري تشغيل النظام الآن..."
exec "$SCRIPT_DIR/run_haseb_erp.sh"