import sys
import paramiko

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

PORT = 22
USER = "deploy"
PASS = "MLN5~3Gg-WJb9&'"
HOST = "2001:67c:2b0:db32::1f61:cd10"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=20)

clean_script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res1 = await prisma.lead.updateMany({
      where: {
        OR: [
          { source: { startsWith: 'Manually' } },
          { source: { startsWith: 'manually' } },
          { source: { startsWith: 'Manual' } },
          { source: '' }
        ]
      },
      data: { source: 'manual' }
    });
    console.log('[+] Updated manual leads in DB:', res1.count);

    const res2 = await prisma.lead.updateMany({
      where: {
        OR: [
          { source: { contains: 'excel' } },
          { source: { contains: 'import' } },
          { source: { contains: 'csv' } }
        ]
      },
      data: { source: 'import' }
    });
    console.log('[+] Updated imported leads in DB:', res2.count);
  } catch (e) {
    console.error('Update error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
"""

stdin, stdout, stderr = client.exec_command(f"""cat << 'EOF' > /var/www/crm-backend/clean_sources_prisma.js
{clean_script}
EOF
(cd /var/www/crm-backend && node clean_sources_prisma.js)
rm -f /var/www/crm-backend/clean_sources_prisma.js
""")

for line in iter(stdout.readline, ""):
    print(line.rstrip())

err = stderr.read().decode('utf-8')
if err:
    print("[STDERR]", err)

client.close()
