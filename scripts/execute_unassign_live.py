import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2001:67c:2b0:db32::1f61:cd10', port=22, username='deploy', password="MLN5~3Gg-WJb9&'", timeout=20)

sftp = client.open_sftp()
with sftp.file('/var/www/crm-backend/do_unassign.js', 'w') as f:
    f.write("""
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const beforeCount = await prisma.lead.count({ where: { ownerId: { not: null } } });
  console.log(`Leads currently assigned before: ${beforeCount}`);

  const updateRes = await prisma.lead.updateMany({
    where: { ownerId: { not: null } },
    data: { ownerId: null }
  });
  console.log(`Successfully unassigned ${updateRes.count} leads!`);

  const afterAssigned = await prisma.lead.count({ where: { ownerId: { not: null } } });
  const afterUnassigned = await prisma.lead.count({ where: { ownerId: null } });
  console.log(`After status -> Assigned: ${afterAssigned}, Unassigned: ${afterUnassigned}`);
}
run().finally(() => prisma.$disconnect());
""")
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /var/www/crm-backend && node do_unassign.js && rm -f do_unassign.js')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
client.close()

