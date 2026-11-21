import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

PASS = "MLN5~3Gg-WJb9&'"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password=PASS, timeout=30)

print("[*] Building next-app on server...")
stdin, stdout, stderr = client.exec_command("cd /var/www/next-app && npm run build")
code = stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print(out)
if err: print("Stderr:", err)

if code == 0:
    print("[+] Build succeeded! Restarting next-app in PM2...")
    stdin, stdout, stderr = client.exec_command("pm2 restart next-app")
    stdout.channel.recv_exit_status()
    print(stdout.read().decode('utf-8', errors='ignore'))
    
    stdin, stdout, stderr = client.exec_command("pm2 status next-app")
    stdout.channel.recv_exit_status()
    print(stdout.read().decode('utf-8', errors='ignore'))
else:
    print(f"[-] Build failed with code {code}")

client.close()

