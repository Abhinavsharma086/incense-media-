import os
import sys
import tarfile
import paramiko
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT_DIR = r"c:\xampp\htdocs\incenseMediaAdminCode"
TAR_PATH = os.path.join(ROOT_DIR, "deploy_final.tar.gz")

print("[*] Creating fast compressed tarball (Frontend code + Backend dist + DB cleaner)...")
if os.path.exists(TAR_PATH):
    try:
        os.remove(TAR_PATH)
    except:
        pass

with tarfile.open(TAR_PATH, "w:gz", compresslevel=9) as tar:
    # 1. Add dist files but exclude assets/img to keep archive ~1.1MB
    frontend_dist = os.path.join(ROOT_DIR, "dist")
    for root, dirs, files in os.walk(frontend_dist):
        if "assets" in root and "img" in root:
            continue
        for file in files:
            abs_p = os.path.join(root, file)
            rel_p = os.path.relpath(abs_p, ROOT_DIR)
            tar.add(abs_p, arcname=rel_p)
    print("  [+] Added frontend dist (clean bundle without static images)")

    # 2. Add backend dist
    backend_dist = os.path.join(ROOT_DIR, "backend", "dist")
    for root, dirs, files in os.walk(backend_dist):
        for file in files:
            abs_p = os.path.join(root, file)
            rel_p = os.path.relpath(abs_p, ROOT_DIR)
            tar.add(abs_p, arcname=rel_p)
    print("  [+] Added backend dist")

    # 3. Add clean_sources.js
    clean_js = os.path.join(ROOT_DIR, "backend", "clean_sources.js")
    if os.path.exists(clean_js):
        tar.add(clean_js, arcname="backend/clean_sources.js")
        print("  [+] Added backend/clean_sources.js")

size_mb = os.path.getsize(TAR_PATH) / (1024 * 1024)
print(f"[+] Archive ready: {size_mb:.2f} MB")

PORT = 22
USER = "deploy"
PASS = "MLN5~3Gg-WJb9&'"
HOSTS = ["2a02:4780:12:c8b::1", "31.97.205.16", "2001:67c:2b0:db32::1f61:cd10"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for h in HOSTS:
    try:
        print(f"\n[*] Connecting to {h}:{PORT} as {USER}...")
        client.connect(h, port=PORT, username=USER, password=PASS, timeout=20)
        client.get_transport().set_keepalive(10)
        print(f"[+] Connected to {h}!")
        connected = True
        break
    except Exception as e:
        print(f"[-] Connection to {h} failed: {e}")

if not connected:
    sys.exit(1)

print("[*] Uploading deploy_final.tar.gz via SFTP...")
sftp = client.open_sftp()
remote_tar = "/tmp/deploy_final.tar.gz"

sftp.put(TAR_PATH, remote_tar)
print(f"[+] Upload complete to {remote_tar}!")
sftp.close()

deploy_commands = f"""
set -e
SUDO_PASS="{PASS}"
echo "[*] Remote server deployment started..."

TMP_EXTRACT="/tmp/deploy_final_extract"
rm -rf "$TMP_EXTRACT"
mkdir -p "$TMP_EXTRACT"
tar -xzf /tmp/deploy_final.tar.gz -C "$TMP_EXTRACT"
echo "[+] Extracted deployment files"

# 1. Update Frontend in /var/www/react-app/build
echo "[*] Updating Frontend in /var/www/react-app/build..."
echo "$SUDO_PASS" | sudo -S mkdir -p /var/www/react-app/build/assets
echo "$SUDO_PASS" | sudo -S cp -rf "$TMP_EXTRACT/dist"/* /var/www/react-app/build/
echo "$SUDO_PASS" | sudo -S chmod -R 755 /var/www/react-app/build

# 2. Update Frontend in /var/www/admin.incensemedia.in
if [ -d "/var/www/admin.incensemedia.in" ]; then
    echo "[*] Updating Frontend in /var/www/admin.incensemedia.in..."
    echo "$SUDO_PASS" | sudo -S cp -rf "$TMP_EXTRACT/dist"/* /var/www/admin.incensemedia.in/
    echo "$SUDO_PASS" | sudo -S chmod -R 755 /var/www/admin.incensemedia.in
fi

# 3. Update Backend in /var/www/crm-backend
echo "[*] Updating Backend dist in /var/www/crm-backend/dist..."
echo "$SUDO_PASS" | sudo -S mkdir -p /var/www/crm-backend/dist
echo "$SUDO_PASS" | sudo -S cp -rf "$TMP_EXTRACT/backend/dist"/* /var/www/crm-backend/dist/
if [ -f "$TMP_EXTRACT/backend/clean_sources.js" ]; then
    echo "$SUDO_PASS" | sudo -S cp -f "$TMP_EXTRACT/backend/clean_sources.js" /var/www/crm-backend/
fi
echo "$SUDO_PASS" | sudo -S chmod -R 755 /var/www/crm-backend/dist

# 4. Run clean_sources.js on server to fix database
echo "[*] Running clean_sources.js on server database..."
(cd /var/www/crm-backend && node clean_sources.js) || true

# 5. Clean tmp
rm -rf "$TMP_EXTRACT"
rm -f /tmp/deploy_final.tar.gz

# 6. Restart PM2 crm-backend
echo "[*] Restarting PM2 process 'crm-backend'..."
pm2 restart crm-backend
sleep 2
pm2 status

# 7. Reload Nginx
echo "[*] Reloading Nginx..."
echo "$SUDO_PASS" | sudo -S systemctl reload nginx

# 8. Check index.html asset hash
echo "[*] Verifying deployed index.html asset hashes:"
grep -E 'app-index' /var/www/react-app/build/index.html || true
if [ -f "/var/www/admin.incensemedia.in/index.html" ]; then
    grep -E 'app-index' /var/www/admin.incensemedia.in/index.html || true
fi

echo "[+] DEPLOYMENT FINISHED SUCCESSFULLY!"
"""

print("[*] Executing remote deployment commands...")
stdin, stdout, stderr = client.exec_command(deploy_commands)

for line in iter(stdout.readline, ""):
    print(line.rstrip())

err = stderr.read().decode('utf-8')
if err:
    print("[STDERR]", err)

client.close()
print("[*] All completed!")
