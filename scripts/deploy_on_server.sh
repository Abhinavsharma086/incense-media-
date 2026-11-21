#!/bin/bash
set -e

echo "=================================================="
echo "   INCENSE MEDIA LIVE AUTOMATED DEPLOYMENT        "
echo "=================================================="

# 1. Locate newest zip
ZIP=$(ls -t /var/www/crm-backend/uploads/*.zip 2>/dev/null | head -n 1)
if [ -z "$ZIP" ]; then
    ZIP=$(find /var/www /tmp -name "*.zip" 2>/dev/null | head -n 1)
fi
if [ -z "$ZIP" ]; then
    echo "[-] Error: deploy zip not found!"
    exit 1
fi
echo "[+] Found zip package: $ZIP"

# 2. Extract to temp
TMP_DIR="/tmp/deploy_extract_now"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
unzip -q -o "$ZIP" -d "$TMP_DIR"
echo "[+] Extracted files successfully."

# 3. Detect Nginx root for admin.incensemedia.in
echo "[*] Detecting Nginx root configuration..."
NGINX_ROOTS=$(grep -rh "root " /etc/nginx/ 2>/dev/null | grep -v "#" | sed 's/.*root //;s/;//' | tr -d ' ' | sort -u)
echo "[*] Configured Nginx roots: $NGINX_ROOTS"

# 4. Copy frontend to all relevant web paths
TARGET_DIRS=(
    "/var/www/admin.incensemedia.in"
    "/var/www/admin.incensemedia.in/dist"
    "/var/www/crm-frontend"
    "/var/www/crm-frontend/dist"
    "/var/www/frontend"
    "/var/www/frontend/dist"
    "/var/www/html"
)

# Also add any directory containing the old index.html or old JS
OLD_FILES=$(find /var/www -name "index-CVs2Nemy.js" -o -name "index-*.js" 2>/dev/null || true)
for f in $OLD_FILES; do
    P_DIR=$(dirname $(dirname "$f"))
    TARGET_DIRS+=("$P_DIR" "$P_DIR/dist")
done

echo "[*] Updating Frontend in target directories..."
for target in "${TARGET_DIRS[@]}"; do
    if [ -d "$target" ]; then
        echo "  -> Copying dist files to: $target"
        cp -rf "$TMP_DIR/dist"/* "$target/" 2>/dev/null || true
        chmod -R 755 "$target" 2>/dev/null || true
    fi
done

# 5. Locate Backend directory & update
BACKEND_DIR="/var/www/crm-backend"
if [ ! -d "$BACKEND_DIR" ]; then
    BACKEND_DIR=$(dirname $(dirname "$ZIP"))
fi

echo "[+] Target Backend Directory: $BACKEND_DIR"
if [ -d "$BACKEND_DIR" ] && [ -d "$TMP_DIR/backend/dist" ]; then
    mkdir -p "$BACKEND_DIR/dist"
    cp -rf "$TMP_DIR/backend/dist"/* "$BACKEND_DIR/dist/"
    if [ -f "$TMP_DIR/backend/package.json" ]; then
        cp -f "$TMP_DIR/backend/package.json" "$BACKEND_DIR/"
    fi
    chmod -R 755 "$BACKEND_DIR/dist" 2>/dev/null || true
    echo "[+] Backend updated successfully!"
fi

# 6. Clean up temp
rm -rf "$TMP_DIR"

# 7. Unblock SSH for future
ufw allow 22/tcp 2>/dev/null || true
fail2ban-client unban --all 2>/dev/null || true
systemctl restart ssh 2>/dev/null || true

# 8. Reload Nginx
echo "[*] Reloading Nginx web server..."
nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true

# 9. Restart PM2 services
echo "[*] Restarting PM2 process..."
pm2 restart all 2>/dev/null || true
su - deploy -c "pm2 restart all" 2>/dev/null || true
su - deploy -c "pm2 status" 2>/dev/null || pm2 status 2>/dev/null || true

# 10. Local verification
echo ""
echo "[*] Verifying deployed index HTML locally..."
curl -s -k -H "Host: admin.incensemedia.in" http://127.0.0.1/ | grep -o 'src="/assets/index-[^"]*"' || true
echo ""
echo "=================================================="
echo "   🎉 LIVE DEPLOYMENT COMPLETED SUCCESSFULLY!     "
echo "=================================================="
