import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import deploy_live

client, user = deploy_live.get_ssh_client()
sftp = client.open_sftp()
local_js = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "add_domain_remote.js")
remote_js = "/var/www/crm-backend/add_domain_remote.js"
sftp.put(local_js, remote_js)
sftp.close()

stdin, stdout, stderr = client.exec_command("cd /var/www/crm-backend && node add_domain_remote.js && rm -f add_domain_remote.js")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
client.close()
