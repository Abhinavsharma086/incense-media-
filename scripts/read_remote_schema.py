import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

script = """
const fs = require('fs');
console.log('=== PRISMA SCHEMA ===');
try {
  console.log(fs.readFileSync('/var/www/crm-backend/prisma/schema.prisma', 'utf8'));
} catch (e) {
  console.log('Schema read error:', e.message);
}
"""

sftp = client.open_sftp()
with sftp.file('/tmp/read_schema.js', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = client.exec_command('node /tmp/read_schema.js')
out = stdout.read().decode('utf-8', errors='replace')
with open('scripts/schema_out.txt', 'w', encoding='utf-8') as f:
    f.write(out)
print("Saved schema to scripts/schema_out.txt")
client.close()

