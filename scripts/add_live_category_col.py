import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("2001:67c:2b0:db32::1f61:cd10", port=22, username="deploy", password="MLN5~3Gg-WJb9&'", timeout=20)

node_code = """
const prisma = require('./dist/utils/prisma').default;
async function main() {
    try {
        const res = await prisma.$executeRawUnsafe('ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `category` VARCHAR(191) NULL DEFAULT "general";');
        console.log('Live DB Category column added successfully!', res);
    } catch (e) {
        try {
            await prisma.$executeRawUnsafe('ALTER TABLE `Lead` ADD COLUMN `category` VARCHAR(191) NULL DEFAULT "general";');
            console.log('Live DB Category column created successfully!');
        } catch (err) {
            console.log('Live DB result:', err.message);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
"""

sftp = client.open_sftp()
with sftp.file("/var/www/crm-backend/add_cat.js", "w") as f:
    f.write(node_code)
sftp.close()

stdin, stdout, stderr = client.exec_command("cd /var/www/crm-backend && node add_cat.js && rm -f add_cat.js")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
client.close()

