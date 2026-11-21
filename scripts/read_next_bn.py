import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=15)
stdin, stdout, stderr = client.exec_command("cat /var/www/next-app/src/components/common/BreakingNews.tsx")
print(stdout.read().decode('utf-8', errors='ignore'))
client.close()

