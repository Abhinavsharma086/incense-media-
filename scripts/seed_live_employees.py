import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"c:\xampp\htdocs\incenseMediaAdminCode"
LOCAL_FILE = os.path.join(ROOT_DIR, "backend", "dist", "utils", "seedAllEmployees.js")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("31.97.205.16", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=15)

print("[*] Uploading seedAllEmployees.js to live server...")
sftp = client.open_sftp()
sftp.put(LOCAL_FILE, "/var/www/crm-backend/dist/utils/seedAllEmployees.js")
sftp.close()
print("[+] Uploaded!")

print("[*] Running seedAllEmployees.js on live database...")
stdin, stdout, stderr = client.exec_command("cd /var/www/crm-backend && node dist/utils/seedAllEmployees.js")

while True:
    line = stdout.readline()
    if not line:
        break
    print(line.rstrip())

err = stderr.read().decode('utf-8', errors='replace')
if err.strip():
    print("[stderr]", err.strip())

print("\n[*] Checking total user count on live DB...")
stdin, stdout, stderr = client.exec_command("cd /var/www/crm-backend && node -e \"const prisma = require('./dist/utils/prisma').default; prisma.user.count().then(c => console.log('Live DB Total Users:', c)).finally(() => prisma.\\$disconnect())\"")
print(stdout.read().decode())

client.close()
print("[+] Done!")

