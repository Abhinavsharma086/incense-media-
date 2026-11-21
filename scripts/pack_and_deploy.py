import os

import sys

import time

import zipfile

import paramiko



sys.stdout.reconfigure(encoding='utf-8')



ROOT_DIR = r"c:\xampp\htdocs\incenseMediaAdminCode"

ZIP_PATH = os.path.join(ROOT_DIR, "deploy_package.zip")



def create_zip():

    print(f"[*] Creating deployment package at {ZIP_PATH}...")

    if os.path.exists(ZIP_PATH):

        try:

            os.remove(ZIP_PATH)

        except Exception:

            pass



    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:

        # 1. Add dist (Frontend)

        frontend_dist = os.path.join(ROOT_DIR, "dist")

        for root, dirs, files in os.walk(frontend_dist):

            for file in files:

                abs_path = os.path.join(root, file)

                rel_path = os.path.relpath(abs_path, ROOT_DIR)

                zipf.write(abs_path, rel_path)

        print(f"  [+] Added frontend dist")



        # 2. Add backend/dist

        backend_dist = os.path.join(ROOT_DIR, "backend", "dist")

        for root, dirs, files in os.walk(backend_dist):

            for file in files:

                abs_path = os.path.join(root, file)

                rel_path = os.path.relpath(abs_path, ROOT_DIR)

                zipf.write(abs_path, rel_path)

        print(f"  [+] Added backend dist")



        # 3. Add backend/package.json

        bpkg = os.path.join(ROOT_DIR, "backend", "package.json")

        if os.path.exists(bpkg):

            zipf.write(bpkg, "backend/package.json")

            print(f"  [+] Added backend/package.json")



        # 4. Add backend/prisma

        bprisma = os.path.join(ROOT_DIR, "backend", "prisma")

        if os.path.exists(bprisma):

            for root, dirs, files in os.walk(bprisma):

                for file in files:

                    abs_path = os.path.join(root, file)

                    rel_path = os.path.relpath(abs_path, ROOT_DIR)

                    zipf.write(abs_path, rel_path)

            print(f"  [+] Added backend/prisma")



        # 5. Add flag_duplicates.js

        bflag = os.path.join(ROOT_DIR, "backend", "flag_duplicates.js")

        if os.path.exists(bflag):

            zipf.write(bflag, "backend/flag_duplicates.js")

            print(f"  [+] Added backend/flag_duplicates.js")
        bmerge = os.path.join(ROOT_DIR, "backend", "auto_merge_duplicates.js")
        if os.path.exists(bmerge):
            zipf.write(bmerge, "backend/auto_merge_duplicates.js")
            print(f"  [+] Added backend/auto_merge_duplicates.js")



    size_mb = os.path.getsize(ZIP_PATH) / (1024 * 1024)

    print(f"[+] Zip package created successfully: {size_mb:.2f} MB")



def deploy():

    create_zip()

    

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

            client.connect(h, port=PORT, username=USER, password=PASS, timeout=20)

            print(f"[+] Connected via SSH to {h}!")

            connected = True

            break

        except Exception as e:

            print(f"[-] Connection to {h} failed: {e}")

    if not connected:

        raise Exception("Failed to connect to any host")



    print("[*] Uploading deploy_package.zip via SFTP...", flush=True)

    sftp = client.open_sftp()

    remote_zip = "/tmp/deploy_package.zip"

    sftp.put(ZIP_PATH, remote_zip)

    print("[+] Upload complete to /tmp/deploy_package.zip!")

    sftp.close()



    deploy_commands = f"""

    set -e

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)

    echo "[*] Server deployment started at $TIMESTAMP"



    TMP_EXTRACT="/tmp/deploy_extract_$TIMESTAMP"

    mkdir -p "$TMP_EXTRACT"

    unzip -q -o /tmp/deploy_package.zip -d "$TMP_EXTRACT"

    echo "[+] Unzipped package"



    # Backup current builds

    if [ -d "/var/www/react-app/build" ]; then

        echo "[*] Backing up /var/www/react-app/build"

        cp -r /var/www/react-app/build "/var/www/react-app/build_backup_$TIMESTAMP" || true

    fi



    if [ -d "/var/www/crm-backend/dist" ]; then

        echo "[*] Backing up /var/www/crm-backend/dist"

        cp -r /var/www/crm-backend/dist "/var/www/crm-backend/dist_backup_$TIMESTAMP" || true

    fi



    # Update Frontend

    echo "[*] Updating Frontend in /var/www/react-app/build..."

    mkdir -p /var/www/react-app/build

    cp -rf "$TMP_EXTRACT/dist"/* /var/www/react-app/build/

    chmod -R 755 /var/www/react-app/build



    echo "[*] Updating Frontend in /var/www/admin.incensemedia.in..."

    mkdir -p /var/www/admin.incensemedia.in

    cp -rf "$TMP_EXTRACT/dist"/* /var/www/admin.incensemedia.in/

    chmod -R 755 /var/www/admin.incensemedia.in



    # Update Backend

    echo "[*] Updating Backend in /var/www/crm-backend..."

    mkdir -p /var/www/crm-backend/dist

    cp -rf "$TMP_EXTRACT/backend/dist"/* /var/www/crm-backend/dist/

    cp -f "$TMP_EXTRACT/backend/package.json" /var/www/crm-backend/ 2>/dev/null || true

    if [ -d "$TMP_EXTRACT/backend/prisma" ]; then

        cp -rf "$TMP_EXTRACT/backend/prisma"/* /var/www/crm-backend/prisma/ 2>/dev/null || true

    fi

    chmod -R 755 /var/www/crm-backend/dist



    echo "[*] Generating Prisma client on server..."

    (cd /var/www/crm-backend && npx prisma generate) || true

    if [ -f "$TMP_EXTRACT/backend/flag_duplicates.js" ]; then

        cp -f "$TMP_EXTRACT/backend/flag_duplicates.js" /var/www/crm-backend/

        echo "[*] Scanning and flagging duplicate leads on server..."

        (cd /var/www/crm-backend && node flag_duplicates.js) || true

    fi
    if [ -f "$TMP_EXTRACT/backend/auto_merge_duplicates.js" ]; then
        cp -f "$TMP_EXTRACT/backend/auto_merge_duplicates.js" /var/www/crm-backend/
        echo "[*] Scanning and auto-merging duplicate leads on server..."
        (cd /var/www/crm-backend && node auto_merge_duplicates.js) || true
    fi



    # Clean up tmp

    rm -rf "$TMP_EXTRACT"

    rm -f /tmp/deploy_package.zip

    echo "[+] Temporary files cleaned"



    # Restart PM2

    echo "[*] Restarting PM2 process 'crm-backend'..."

    pm2 restart crm-backend || pm2 restart all

    sleep 2

    pm2 status



    # Verify local backend response

    echo "[*] Testing backend response on localhost:5000..."

    curl -s http://127.0.0.1:5000/api/auth/me || true

    echo ""



    # Verify live frontend asset hash

    echo "[*] Checking live index.html on admin.incensemedia.in..."

    head -n 20 /var/www/react-app/build/index.html | grep -E 'assets/' || true



    echo "[+] Deployment execution finished successfully!"

    """



    print("\n[*] Executing remote deployment script...")

    stdin, stdout, stderr = client.exec_command(deploy_commands)

    

    # Stream output

    while True:

        line = stdout.readline()

        if not line:

            break

        print(line.rstrip(), flush=True)

        

    err = stderr.read().decode('utf-8', errors='replace')

    if err.strip():

        print(f"\n[stderr]\n{err.strip()}")



    client.close()

    print("\n==================================================")

    print("   LIVE DEPLOYMENT FINISHED ON 31.97.205.16!      ")

    print("==================================================")



if __name__ == "__main__":

    deploy()



