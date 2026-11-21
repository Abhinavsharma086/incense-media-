import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("2a02:4780:12:c8b::1", port=22, username='deploy', password="MLN5~3Gg-WJb9&'", timeout=15)

print("=== CHECKING FILES IN /var/www/crm-backend/uploads/services AND node-app/uploads/services ===")
stdin, stdout, stderr = ssh.exec_command("""
echo '--- crm-backend uploads/services ---'
ls -la /var/www/crm-backend/uploads/services 2>/dev/null
echo '--- node-app uploads/services ---'
ls -la /var/www/node-app/uploads/services 2>/dev/null
echo '--- any files with banner or service in uploads ---'
find /var/www -type f -name "*smm*" -o -name "*happy-new-year*" -o -name "*tweo5g*" 2>/dev/null
""")
print(stdout.read().decode('utf-8', errors='ignore'))

print("=== CHECKING ServiceOffers and ServicePackages TABLES ===")
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM ServiceOffers; SELECT * FROM ServicePackages;" """)
print(stdout.read().decode('utf-8', errors='ignore'))

print("=== CHECKING ALL TABLES IN DATABASE CONTAINING 'marketing' OR 'consult' OR 'advertis' ===")
stdin, stdout, stderr = ssh.exec_command("""
mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "
SELECT id, title, slug, banner, deletedAt FROM Services;
"
""")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
