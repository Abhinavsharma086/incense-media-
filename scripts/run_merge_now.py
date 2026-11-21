import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

stdin, stdout, stderr = client.exec_command('node /var/www/crm-backend/auto_merge_duplicates.js')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
client.close()

