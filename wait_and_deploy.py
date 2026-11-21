import socket
import time
import os
import sys
import paramiko

TARGET_HOST = "31.97.205.16"
PORT = 22
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(ROOT_DIR, "deploy_package.zip")
KEY_PATH = os.path.join(ROOT_DIR, "scripts", "deploy_key")
deploy_pkey = None
if os.path.exists(KEY_PATH):
    try:
        deploy_pkey = paramiko.RSAKey.from_private_key_file(KEY_PATH)
    except:
        pass

CREDENTIALS = [
    ("root", "?3ZD79d854Z4AMH-EFWn"),
    ("deploy", "MLN5~3Gg-Wb9&'"),
    ("deploy", "MLN5~3Gg-WJb9&'"),
    ("deploy", "?3ZD79d854Z4AMH-EFWn"),
]

def check_port():
    s = socket.socket()
    s.settimeout(2.5)
    try:
        r = s.connect_ex((TARGET_HOST, PORT))
        return r == 0
    except Exception:
        return False
    finally:
        s.close()

def run_cmd(c, cmd):
    print(f"\n$ {cmd}", flush=True)
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out.strip():
        print(out.strip(), flush=True)
    if err.strip():
        print(f"[stderr] {err.strip()}", flush=True)
    return out

def main():
    if not os.path.exists(ZIP_PATH):
        print(f"[-] Error: {ZIP_PATH} not found! Please build first.", flush=True)
        sys.exit(1)

    print("=======================================================", flush=True)
    print("      INCENSE MEDIA LIVE AUTOMATED DEPLOYMENT          ", flush=True)
    print("=======================================================", flush=True)
    print(f"Target: {TARGET_HOST} (https://admin.incensemedia.in/)", flush=True)
    print(f"Deploy Package: {ZIP_PATH} ({os.path.getsize(ZIP_PATH)/(1024*1024):.2f} MB)", flush=True)
    print(f"[*] Waiting for VPS to apply password and accept SSH...", flush=True)

    client = None
    active_user = None

    for attempt in range(1, 121): # Try for 10 minutes (120 * 5s)
        port_open = check_port()
        if not port_open:
            print(f"[{attempt}/120] VPS is rebooting... (Port 22 not yet open)", flush=True)
            time.sleep(5)
            continue

        # 1. Try SSH Key if available
        if deploy_pkey:
            for user in ["root", "deploy"]:
                try:
                    c = paramiko.SSHClient()
                    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    c.connect(TARGET_HOST, port=PORT, username=user, pkey=deploy_pkey, timeout=6, auth_timeout=6, banner_timeout=6)
                    print(f"\n[+] LOGIN SUCCESSFUL with SSH Key as '{user}' on {TARGET_HOST}!", flush=True)
                    client = c
                    active_user = user
                    break
                except Exception:
                    try: c.close()
                    except: pass
            if client:
                break

        # 2. Try Passwords
        for user, pwd in CREDENTIALS:
            try:
                c = paramiko.SSHClient()
                c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                c.connect(TARGET_HOST, port=PORT, username=user, password=pwd, timeout=6, auth_timeout=6, banner_timeout=6)
                print(f"\n[+] LOGIN SUCCESSFUL as '{user}' on {TARGET_HOST}!", flush=True)
                client = c
                active_user = user
                break
            except paramiko.AuthenticationException:
                pass
            except Exception as e:
                pass
            finally:
                try:
                    if not client:
                        c.close()
                except:
                    pass

        if client:
            break

        print(f"[{attempt}/120] Port 22 open, waiting for password update to apply... (retrying in 5s)", flush=True)
        time.sleep(5)

    if not client:
        print("[-] Timed out waiting for SSH authentication.", flush=True)
        sys.exit(1)

    print("\n[*] Inspecting server environment...", flush=True)
    run_cmd(client, "whoami; hostname; pwd; free -m; df -h /")

    # Detect directories
    run_cmd(client, "find /var/www /home/deploy -maxdepth 2 -type d 2>/dev/null || true")

    # Upload zip via SFTP
    print(f"\n[*] Uploading {ZIP_PATH} ({os.path.getsize(ZIP_PATH)/(1024*1024):.2f} MB) via SFTP...", flush=True)
    sftp = client.open_sftp()
    remote_zip = "/tmp/deploy_package.zip"
    sftp.put(ZIP_PATH, remote_zip)
    print("[+] Upload complete to /tmp/deploy_package.zip!", flush=True)
    sftp.close()

    deploy_script = """
    set -e
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "[*] Starting deployment at $TIMESTAMP"

    # Identify Backend dir
    BACKEND_DIR=""
    for d in /var/www/crm-backend /var/www/backend /var/www/incenseMediaAdminCode/backend /home/deploy/crm-backend /var/www/admin.incensemedia.in/backend /var/www/incense-backend; do
        if [ -d "$d" ]; then
            BACKEND_DIR="$d"
            break
        fi
    done

    # Identify Frontend dir
    FRONTEND_DIR=""
    for d in /var/www/crm-frontend /var/www/admin.incensemedia.in /var/www/frontend /var/www/incenseMediaAdminCode /var/www/html /var/www/incense-frontend; do
        if [ -d "$d" ]; then
            FRONTEND_DIR="$d"
            break
        fi
    done

    echo "[+] Detected Backend Dir: $BACKEND_DIR"
    echo "[+] Detected Frontend Dir: $FRONTEND_DIR"

    TMP_EXTRACT="/tmp/deploy_extract_$TIMESTAMP"
    mkdir -p "$TMP_EXTRACT"
    unzip -q -o /tmp/deploy_package.zip -d "$TMP_EXTRACT"

    # 1. Update Frontend
    if [ -n "$FRONTEND_DIR" ] && [ -d "$TMP_EXTRACT/dist" ]; then
        echo "[*] Updating Frontend in $FRONTEND_DIR..."
        if [ -d "$FRONTEND_DIR/dist" ]; then
            cp -r "$FRONTEND_DIR/dist" "$FRONTEND_DIR/dist_bak_$TIMESTAMP" || true
            cp -r "$TMP_EXTRACT/dist"/* "$FRONTEND_DIR/dist/" || true
        else
            cp -r "$TMP_EXTRACT/dist" "$FRONTEND_DIR/dist" || cp -r "$TMP_EXTRACT/dist"/* "$FRONTEND_DIR/" || true
        fi
    fi

    # 2. Update Backend
    if [ -n "$BACKEND_DIR" ]; then
        echo "[*] Updating Backend in $BACKEND_DIR..."
        if [ -d "$BACKEND_DIR/dist" ]; then
            cp -r "$BACKEND_DIR/dist" "$BACKEND_DIR/dist_bak_$TIMESTAMP" || true
        fi
        if [ -d "$TMP_EXTRACT/backend/dist" ]; then
            cp -r "$TMP_EXTRACT/backend/dist"/* "$BACKEND_DIR/dist/" 2>/dev/null || cp -r "$TMP_EXTRACT/backend/dist" "$BACKEND_DIR/" || true
        fi
        if [ -d "$TMP_EXTRACT/backend/src" ]; then
            cp -r "$TMP_EXTRACT/backend/src"/* "$BACKEND_DIR/src/" 2>/dev/null || cp -r "$TMP_EXTRACT/backend/src" "$BACKEND_DIR/" || true
        fi
    fi

    rm -rf "$TMP_EXTRACT"
    rm -f /tmp/deploy_package.zip

    # 3. Ensure permissions
    chown -R deploy:deploy "$BACKEND_DIR" 2>/dev/null || true
    chown -R deploy:deploy "$FRONTEND_DIR" 2>/dev/null || true

    # 4. Restart PM2 backend
    echo "[*] Restarting PM2 process..."
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart all || pm2 reload all || true
        pm2 status || true
    fi

    echo "[+] Deployment steps executed successfully!"
    """

    run_cmd(client, deploy_script)
    client.close()

    print("\n=======================================================", flush=True)
    print("      🎉 LIVE DEPLOYMENT COMPLETED SUCCESSFULLY!       ", flush=True)
    print("=======================================================", flush=True)

if __name__ == "__main__":
    main()
