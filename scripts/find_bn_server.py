import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=15)
stdin, stdout, stderr = client.exec_command("""
echo '=== NEXT-APP ==='
find /var/www/next-app/ -name "*BreakingNews*" 2>/dev/null
find /var/www/next-app/ -name "*breaking*" 2>/dev/null
echo '=== NODE-APP ==='
find /var/www/node-app/ -name "*BreakingNews*" 2>/dev/null
echo '=== REACT-APP ==='
find /var/www/react-app/ -name "*BreakingNews*" 2>/dev/null
""")
print(stdout.read().decode('utf-8', errors='ignore'))
client.close()
