import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

script = """
const bcrypt = require('/var/www/crm-backend/node_modules/bcryptjs');
const { PrismaClient } = require('/var/www/crm-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== LEADS FOR VIBHUR / 6283834316 ===');
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { phone: { contains: '6283834316' } },
        { fullName: { contains: 'Vibhur' } }
      ]
    },
    include: { owner: true }
  });
  console.log('Total leads found:', leads.length);
  for (const l of leads) {
    console.log(`Lead ID: ${l.id} | Name: ${l.fullName} | Phone: ${l.phone} | Category: ${l.category} | Source: ${l.source} | Status: ${l.status} | Owner: ${l.owner?.firstName} ${l.owner?.lastName} (${l.assignedToId}) | isDuplicate: ${l.isDuplicate}`);
    console.log(`   Notes: ${l.notes}`);
  }

  console.log('\\n=== CHECK ANAND PASSWORD ===');
  const anand = await prisma.user.findFirst({
    where: { phone: { contains: '7878437633' } }
  });
  if (anand) {
    console.log('Anand user found:', anand.firstName, anand.lastName, anand.phone, anand.email);
    console.log('Anand hash:', anand.password);
    const passes = ['Incense@123', 'emp123', 'Admin@123', 'super123', '123456', '7878437633', 'password', 'anand123', 'Anand@123', '12345678'];
    for (const p of passes) {
      const match = await bcrypt.compare(p, anand.password);
      console.log(`Password "${p}": match = ${match}`);
    }
  } else {
    console.log('Anand NOT found by phone 7878437633!');
  }
}

run().catch(e => console.error('RUN ERROR:', e)).finally(() => prisma.$disconnect());
"""

sftp = client.open_sftp()
with sftp.file('/tmp/inspect_leads_and_pass.js', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = client.exec_command('node /tmp/inspect_leads_and_pass.js')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
with open('scripts/full_run_out.txt', 'w', encoding='utf-8') as f:
    f.write("STDOUT:\n" + out + "\nSTDERR:\n" + err)
print("Saved to scripts/full_run_out.txt")
client.close()
