import paramiko
import subprocess

print("=== CHECKING LOCAL SERVICES TABLE ===")
try:
    cmd = r"& 'c:\xampp\mysql\bin\mysql.exe' -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e 'SELECT id, title, slug, image, bannerImage, isActive, deletedAt, createdAt, updatedAt FROM Services\G'"
    res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("LOCAL ERR:", res.stderr)
except Exception as e:
    print("LOCAL EXCEPTION:", e)

print("\n=== CHECKING LIVE SERVICES TABLE VIA SSH ===")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("2a02:4780:12:c8b::1", port=22, username='deploy', password="MLN5~3Gg-WJb9&'", timeout=15)

# 1. All rows in Services
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT id, title, slug, image, bannerImage, isActive, deletedAt, createdAt, updatedAt FROM Services\\G" """)
print("ALL ROWS IN LIVE Services:")
print(stdout.read().decode('utf-8', errors='ignore'))

# 2. Check if other tables have services (like service, ServiceOffers, etc.)
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SHOW TABLES LIKE '%service%';" """)
print("SERVICE RELATED TABLES:")
print(stdout.read().decode('utf-8', errors='ignore'))

# 3. If there is a table called `service` (lowercase)
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM service\\G" """)
print("TABLE `service` (lowercase):")
print(stdout.read().decode('utf-8', errors='ignore'))

# 4. Search binary logs for Services table INSERT / UPDATE
stdin, stdout, stderr = ssh.exec_command("""
echo "MLN5~3Gg-WJb9&'" | sudo -S bash -c '
for f in $(ls -t /var/log/mysql/binlog.* /var/lib/mysql/binlog.* 2>/dev/null | head -n 30); do
    count=$(mysqlbinlog -v --base64-output=DECODE-ROWS "$f" 2>/dev/null | grep -i "Services" | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "FOUND $count IN $f"
        mysqlbinlog -v --base64-output=DECODE-ROWS "$f" 2>/dev/null | grep -i -C 5 "Services" | head -n 40
    fi
done
'
""")
print("BINLOG SEARCH:")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
