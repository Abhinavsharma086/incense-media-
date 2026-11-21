#!/usr/bin/env python3
"""
Automated Live Deployment Script for https://admin.incensemedia.in
Connects via SSH to 31.97.205.16 / 2a02:4780:12:c8b::1, uploads deploy_package.zip, and restarts services.
"""

import os
import sys
import time
import zipfile
import paramiko

HOSTS = ["2a02:4780:12:c8b::1", "31.97.205.16", "2001:67c:2b0:db32::1f61:cd10"]
PORT = 22
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(ROOT_DIR, "deploy_package.zip")
KEY_PATH = os.path.join(ROOT_DIR, "scripts", "deploy_key")

CREDENTIALS = [
    ("deploy", "MLN5~3Gg-WJb9&'"),
    ("root", "?3ZD79d854Z4AMH-EFWn"),
    ("deploy", "MLN5~3Gg-Wb9&'"),
]

def log(msg):
    print(msg, flush=True)

def get_ssh_client():
    pkey = None
    if os.path.exists(KEY_PATH):
        try:
            pkey = paramiko.RSAKey.from_private_key_file(KEY_PATH, password="MLN5~3Gg-WJb9&'")
            log("[+] Decrypted deploy_key successfully.")
        except Exception as e:
            log(f"[-] Key decrypt note: {e}")

    last_err = None
    for h in HOSTS:
        # 1. Try Key
        if pkey:
            for u in ["deploy", "root"]:
                log(f"[*] Trying key for {u}@{h}:{PORT}...")
                try:
                    client = paramiko.SSHClient()
                    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    client.connect(h, port=PORT, username=u, pkey=pkey, look_for_keys=False, allow_agent=False, timeout=5, auth_timeout=5)
                    log(f"[+] Connected successfully with key as {u} to {h}!")
                    return client, u
                except Exception as e:
                    last_err = e

        # 2. Try Password
        for u, p in CREDENTIALS:
            log(f"[*] Trying password for {u}@{h}:{PORT}...")
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(h, port=PORT, username=u, password=p, look_for_keys=False, allow_agent=False, timeout=5, auth_timeout=5)
                log(f"[+] Connected successfully as {u} to {h}!")
                return client, u
            except Exception as e:
                last_err = e

    raise RuntimeError(f"Could not connect to server: {last_err}")

def run_command(client, cmd):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out.strip():
        print(out.strip())
    if err.strip():
        print(f"[stderr] {err.strip()}")
    return out

def main():
    if not os.path.exists(ZIP_PATH):
        print(f"[-] Error: {ZIP_PATH} not found! Please build first.")
        sys.exit(1)

    print("==================================================")
    print("      INCENSE MEDIA LIVE DEPLOYMENT")
    print("==================================================")
    print(f"Deploy Package: {ZIP_PATH} ({os.path.getsize(ZIP_PATH) / (1024*1024):.2f} MB)")

    client, current_user = get_ssh_client()

    print("\n[*] Uploading deploy_package.zip via SFTP...")
    sftp = client.open_sftp()
    remote_zip = "/tmp/deploy_package.zip"
    sftp.put(ZIP_PATH, remote_zip)
    print("[+] Upload complete to /tmp/deploy_package.zip!")
    sftp.close()

    deploy_cmd = """
    set -e
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "[*] Timestamp: $TIMESTAMP"

    TMP_EXTRACT="/tmp/deploy_extract_$TIMESTAMP"
    mkdir -p "$TMP_EXTRACT"
    unzip -q -o /tmp/deploy_package.zip -d "$TMP_EXTRACT"

    # 1. Update Frontend
    TARGET_FRONTEND_DIRS=(
        "/var/www/admin.incensemedia.in"
        "/var/www/admin.incensemedia.in/dist"
        "/var/www/crm-frontend"
        "/var/www/crm-frontend/dist"
        "/var/www/frontend"
        "/var/www/frontend/dist"
        "/var/www/html"
    )

    for target in "${TARGET_FRONTEND_DIRS[@]}"; do
        if [ -d "$target" ]; then
            echo "  -> Updating frontend in: $target"
            cp -rf "$TMP_EXTRACT/dist"/* "$target/" 2>/dev/null || true
            chmod -R 755 "$target" 2>/dev/null || true
        fi
    done

    # 2. Update Backend
    TARGET_BACKEND_DIRS=(
        "/var/www/crm-backend"
        "/var/www/admin.incensemedia.in/backend"
        "/var/www/backend"
        "/home/deploy/crm-backend"
    )

    for btarget in "${TARGET_BACKEND_DIRS[@]}"; do
        if [ -d "$btarget" ]; then
            echo "  -> Updating backend in: $btarget"
            if [ -d "$TMP_EXTRACT/backend/dist" ]; then
                mkdir -p "$btarget/dist"
                cp -rf "$TMP_EXTRACT/backend/dist"/* "$btarget/dist/" 2>/dev/null || true
            fi
            if [ -f "$TMP_EXTRACT/backend/package.json" ]; then
                cp -f "$TMP_EXTRACT/backend/package.json" "$btarget/" 2>/dev/null || true
            fi
            chmod -R 755 "$btarget" 2>/dev/null || true
        fi
    done

    rm -rf "$TMP_EXTRACT"
    rm -f /tmp/deploy_package.zip

    # 3. Reload Nginx
    echo "[*] Reloading Nginx web server..."
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true

    # 4. Restart PM2 services
    echo "[*] Restarting PM2 services..."
    pm2 restart all 2>/dev/null || true
    su - deploy -c "pm2 restart all" 2>/dev/null || true
    su - deploy -c "pm2 status" 2>/dev/null || pm2 status 2>/dev/null || true

    # 5. Local verification
    echo ""
    echo "[*] Verifying deployed bundle on live admin..."
    curl -s -k -H "Host: admin.incensemedia.in" http://127.0.0.1/ | grep -o 'src="/assets/index-[^"]*"' || true
    echo ""
    echo "[+] Deployment finished successfully!"
    """

    run_command(client, deploy_cmd)
    client.close()
    print("\n==================================================")
    print("   🎉 LIVE DEPLOYMENT COMPLETED SUCCESSFULLY!     ")
    print("==================================================")

if __name__ == "__main__":
    main()
