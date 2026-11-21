import os
import sys
import tarfile
import paramiko
import time

ROOT_DIR = r"c:\xampp\htdocs\incenseMediaAdminCode"
TAR_PATH = os.path.join(ROOT_DIR, "deploy_light.tar.gz")

print("[*] Creating compressed tar.gz (Frontend dist + Backend dist)...")
if os.path.exists(TAR_PATH):
    try:
        os.remove(TAR_PATH)
    except:
        pass

with tarfile.open(TAR_PATH, "w:gz", compresslevel=9) as tar:
    # 1. Frontend dist
    frontend_dist = os.path.join(ROOT_DIR, "dist")
    tar.add(frontend_dist, arcname="dist")
    print("  [+] Added frontend dist")

    # 2. Backend dist
    backend_dist = os.path.join(ROOT_DIR, "backend", "dist")
    tar.add(backend_dist, arcname="backend/dist")
    print("  [+] Added backend dist")

size_mb = os.path.getsize(TAR_PATH) / (1024 * 1024)
print(f"[+] Archive created successfully: {size_mb:.2f} MB")

PORT = 22
USER = "deploy"
PASS = "MLN5~3Gg-WJb9&'"
HOSTS = ["2001:67c:2b0:db32::1f61:cd10", "31.97.205.16"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for h in HOSTS:
    try:
        print(f"\n[*] Connecting to {h}:{PORT} as {USER}...")
        client.connect(h, port=PORT, username=USER, password=PASS, timeout=30)
        client.get_transport().set_keepalive(10)
        print(f"[+] Connected to {h}!")
        connected = True
        break
    except Exception as e:
        print(f"[-] Connection to {h} failed: {e}")

if not connected:
    sys.exit(1)

print("[*] Uploading deploy_light.tar.gz via SFTP with progress...")
sftp = client.open_sftp()
remote_tar = "/tmp/deploy_light.tar.gz"

def callback(transferred, total):
    percent = (transferred / total) * 100
    print(f"  Uploading: {transferred}/{total} bytes ({percent:.1f}%)", end='\r', flush=True)

sftp.put(TAR_PATH, remote_tar, callback=callback)
print(f"\n[+] Upload complete to {remote_tar}!")
sftp.close()

deploy_commands = """
set -e
echo "[*] Server update started..."

# 1. Extract to tmp
TMP_EXTRACT="/tmp/deploy_light_extract"
rm -rf "$TMP_EXTRACT"
mkdir -p "$TMP_EXTRACT"
tar -xzf /tmp/deploy_light.tar.gz -C "$TMP_EXTRACT"
echo "[+] Extracted tar.gz"

# 2. Update frontend
echo "[*] Updating frontend in /var/www/react-app/build..."
mkdir -p /var/www/react-app/build
cp -rf "$TMP_EXTRACT/dist"/* /var/www/react-app/build/
chmod -R 755 /var/www/react-app/build

echo "[*] Updating frontend in /var/www/admin.incensemedia.in (if exists)..."
if [ -d "/var/www/admin.incensemedia.in" ]; then
    cp -rf "$TMP_EXTRACT/dist"/* /var/www/admin.incensemedia.in/
    chmod -R 755 /var/www/admin.incensemedia.in
fi

# 3. Update backend dist
echo "[*] Updating backend in /var/www/crm-backend/dist..."
mkdir -p /var/www/crm-backend/dist
cp -rf "$TMP_EXTRACT/backend/dist"/* /var/www/crm-backend/dist/
chmod -R 755 /var/www/crm-backend/dist

# 4. Clean tmp
rm -rf "$TMP_EXTRACT"
rm -f /tmp/deploy_light.tar.gz
echo "[+] Cleaned tmp files"

# 5. Restart backend PM2
echo "[*] Restarting PM2 crm-backend..."
pm2 restart crm-backend
sleep 2
pm2 status

# 6. Reload Nginx
echo "MLN5~3Gg-WJb9&'" | sudo -S systemctl reload nginx 2>/dev/null || true

echo "[+] Deployment completed successfully!"
"""

print("[*] Executing remote deployment commands...")
stdin, stdout, stderr = client.exec_command(deploy_commands)

for line in iter(stdout.readline, ""):
    print(line.rstrip())

err = stderr.read().decode('utf-8')
if err:
    print("[STDERR]", err)

client.close()
print("[*] All done!")
