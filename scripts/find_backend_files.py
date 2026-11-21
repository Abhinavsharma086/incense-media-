import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

script = """
const fs = require('fs');
const path = require('path');

function findFiles(dir, match) {
  let res = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        res = res.concat(findFiles(full, match));
      } else if (match.test(file)) {
        res.push(full);
      }
    }
  } catch(e){}
  return res;
}

console.log('=== AUTH & USER CONTROLLERS ===');
const files = findFiles('/var/www/crm-backend/src', /(auth|user|lead)/i);
files.forEach(f => console.log(f));

"""

sftp = client.open_sftp()
with sftp.file('/tmp/find_backend_files.js', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = client.exec_command('node /tmp/find_backend_files.js')
out = stdout.read().decode('utf-8', errors='replace')
with open('scripts/backend_files.txt', 'w', encoding='utf-8') as f:
    f.write(out)
print(out)
client.close()

