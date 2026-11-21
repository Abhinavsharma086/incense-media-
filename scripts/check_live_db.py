import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import deploy_live

client, user = deploy_live.get_ssh_client()
node_cmd = """cd /var/www/crm-backend && node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } }
  });
  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
'"""
stdin, stdout, stderr = client.exec_command(node_cmd)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("OUTPUT:\n", out)
if err:
    print("ERROR:\n", err)
client.close()
