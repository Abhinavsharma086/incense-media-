import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import deploy_live

client, user = deploy_live.get_ssh_client()
sftp = client.open_sftp()
local_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "migrate_categories_domains_phones.cjs")
remote_script = "/var/www/crm-backend/migrate_categories_domains_phones.cjs"
sftp.put(local_script, remote_script)
sftp.close()
print("Uploaded migration script to server.")

cmd = "cd /var/www/crm-backend && node migrate_categories_domains_phones.cjs && rm -f migrate_categories_domains_phones.cjs"
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
