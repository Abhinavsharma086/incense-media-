import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

PASS = "MLN5~3Gg-WJb9&'"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password=PASS, timeout=15)

print("[*] Clearing Next.js cache and restarting...")
stdin, stdout, stderr = client.exec_command("rm -rf /var/www/next-app/.next/cache && pm2 restart next-app")
code = stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8', errors='ignore'))

stdin, stdout, stderr = client.exec_command("pm2 status next-app")
code = stdout.channel.recv_exit_status()
print(stdout.read().decode('utf-8', errors='ignore'))

client.close()

