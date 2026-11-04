#!/usr/bin/env bash
# تثبيت وتشغيل نظام ASF المحاسبي ونظام التراخيص المعتمد V2 لبيئات Linux / macOS

set -e

echo "==============================================================================="
echo "               نظام ASF ENTERPRISE ERP - الإصدار المؤسسي المعتمد"
echo "              برنامج التثبيت الشامل لسطح المكتب والشبكة المحلية (LAN)"
echo "==============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v bun &> /dev/null; then
    RUNTIME="bun"
    echo "[OK] تم العثور على محرك Bun."
elif command -v node &> /dev/null; then
    RUNTIME="node"
    echo "[OK] تم العثور على محرك Node.js."
else
    echo "[!] يرجى تثبيت Node.js أو Bun أولاً لتشغيل النظام."
    exit 1
fi

echo "[1/4] تثبيت الاعتماديات..."
if [ "$RUNTIME" = "bun" ]; then
    bun install
else
    npm install
fi

echo "[2/4] بناء واجهة البرنامج وتجميع الملفات..."
if [ "$RUNTIME" = "bun" ]; then
    bun run build
else
    npm run build
fi

echo "[3/4] إنشاء سكربتات التشغيل السريع..."
cat << 'EOF' > run_erp_app.sh
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
echo "جاري تشغيل نظام ASF المحاسبي والشبكة المحلية..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    open "http://localhost:3000" &
fi
bun server.ts || npx tsx server.ts
EOF
chmod +x run_erp_app.sh

cat << 'EOF' > run_license_admin.sh
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
bun scripts/license_admin_cli.ts || npx tsx scripts/license_admin_cli.ts
EOF
chmod +x run_license_admin.sh

echo "[4/4] تم التثبيت بنجاح!"
echo "يمكنك تشغيل البرنامج المحاسبي بالأمر: ./run_erp_app.sh"
echo "أو تشغيل أداة التفعيل والتراخيص بالأمر: ./run_license_admin.sh"
