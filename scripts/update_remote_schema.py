import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import deploy_live

client, user = deploy_live.get_ssh_client()
sftp = client.open_sftp()
local_schema = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "prisma", "schema.prisma")
remote_schema = "/var/www/crm-backend/prisma/schema.prisma"
sftp.put(local_schema, remote_schema)
sftp.close()
print("Uploaded updated schema.prisma to remote server.")

cmd = "cd /var/www/crm-backend && npx prisma generate"
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
