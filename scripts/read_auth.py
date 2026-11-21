import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

script = """
const fs = require('fs');
console.log('=== AUTH CONTROLLER ===');
console.log(fs.readFileSync('/var/www/crm-backend/src/controllers/auth.controller.ts', 'utf8'));

console.log('\\n=== ALL ROUTES IN SRC/ROUTES ===');
console.log(fs.readdirSync('/var/www/crm-backend/src/routes'));
console.log('\\n=== ALL CONTROLLERS IN SRC/CONTROLLERS ===');
console.log(fs.readdirSync('/var/www/crm-backend/src/controllers'));
"""

sftp = client.open_sftp()
with sftp.file('/tmp/read_auth.js', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = client.exec_command('node /tmp/read_auth.js')
out = stdout.read().decode('utf-8', errors='replace')
with open('scripts/auth_code.txt', 'w', encoding='utf-8') as f:
    f.write(out)
print("Saved to scripts/auth_code.txt")
client.close()

