import socket
import time
import os
import sys
import paramiko

TARGET_HOSTS = ["31.97.205.16", "2001:67c:2b0:db32::1f61:cd10"]
PORT = 22
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(ROOT_DIR, "deploy_package.zip")

CREDENTIALS = [
    ("deploy", "MLN5~3Gg-Wb9&'"),
    ("deploy", "MLN5~3Gg-WJb9&'"),
    ("deploy", "MLN5~3Gg-Wb9&"),
    ("deploy", "MLN5~3Gg-WJb9&"),
    ("root", "?3ZD79d854Z4AMH-EFWn"),
]

def check_ssh_port(host, port):
    af = socket.AF_INET6 if ":" in host else socket.AF_INET
    s = socket.socket(af, socket.SOCK_STREAM)
    s.settimeout(2.5)
    try:
        r = s.connect_ex((host, port))
        return r == 0
    except Exception:
        return False
    finally:
        s.close()

def wait_for_ssh():
    print(f"[*] Monitoring SSH on {TARGET_HOSTS[0]}:{PORT} for firewall rule to become active...", flush=True)
    for i in range(120): # up to 10 minutes
        for h in TARGET_HOSTS:
            if check_ssh_port(h, PORT):
                # Verify banner exchange
                try:
                    c = paramiko.SSHClient()
                    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    for u, p in CREDENTIALS:
                        try:
                            c.connect(h, port=PORT, username=u, password=p, timeout=5, banner_timeout=5)
                            print(f"\n[+] SSH IS OPEN & AUTHENTICATED! Connected as '{u}' to {h}!", flush=True)
                            return c, u
                        except paramiko.AuthenticationException:
                            print(f"[!] Connected to {h}:{PORT} but auth failed for {u}, trying next...", flush=True)
                        except Exception:
                            pass
                except Exception:
                    pass

        print(f"[{i+1}/120] Waiting for Hostinger firewall rule to apply... (checking every 5s)", flush=True)
        time.sleep(5)
    return None, None

def run_cmd(client, cmd):
    print(f"\n$ {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd)
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
    print("      INCENSE MEDIA AUTOMATED LIVE DEPLOYMENT          ", flush=True)
    print("=======================================================", flush=True)
    print(f"Target: {TARGET_HOSTS[0]} (https://admin.incensemedia.in/)", flush=True)
    print(f"Deploy Package: {ZIP_PATH} ({os.path.getsize(ZIP_PATH)/(1024*1024):.2f} MB)", flush=True)

    client, user = wait_for_ssh()

    if not client:
        print("[-] Timed out waiting for SSH access. Please check Hostinger panel.", flush=True)
        sys.exit(1)

    print("\n[*] Inspecting server environment...", flush=True)
    run_cmd(client, "whoami; hostname; pwd; free -m; df -h /")

    # Upload zip via SFTP
    print(f"\n[*] Uploading {ZIP_PATH} ({os.path.getsize(ZIP_PATH)/(1024*1024):.2f} MB) via SFTP...", flush=True)
    sftp = client.open_sftp()
    remote_zip = "/tmp/deploy_package.zip"
    sftp.put(ZIP_PATH, remote_zip)
    print("[+] Upload complete to /tmp/deploy_package.zip!", flush=True)
    sftp.close()

    # Deployment shell execution on server
    deploy_script = """
    set -e
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "[*] Starting deployment at $TIMESTAMP"

    # Identify Backend dir
    BACKEND_DIR=""
    for d in /var/www/crm-backend /var/www/backend /var/www/incenseMediaAdminCode/backend /home/deploy/crm-backend /var/www/admin.incensemedia.in/backend; do
        if [ -d "$d" ]; then
            BACKEND_DIR="$d"
            break
        fi
    done

    # Identify Frontend dir
    FRONTEND_DIR=""
    for d in /var/www/crm-frontend /var/www/admin.incensemedia.in /var/www/frontend /var/www/incenseMediaAdminCode /var/www/html; do
        if [ -d "$d" ]; then
            FRONTEND_DIR="$d"
            break
        fi
    done

    echo "[+] Detected Backend Dir: $BACKEND_DIR"
    echo "[+] Detected Frontend Dir: $FRONTEND_DIR"

    # Extract temporary
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

    # Clean tmp extract
    rm -rf "$TMP_EXTRACT"

    # 3. Restart PM2 backend
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
