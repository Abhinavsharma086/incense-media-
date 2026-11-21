import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("2a02:4780:12:c8b::1", port=22, username='deploy', password="MLN5~3Gg-WJb9&'", timeout=15)

print("=== DESCRIBE Services ===")
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "DESCRIBE Services;" """)
print(stdout.read().decode())

print("=== ALL ROWS FROM Services ===")
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM Services\\G" """)
print(stdout.read().decode('utf-8', errors='ignore'))

print("=== DESCRIBE service (lowercase) ===")
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "DESCRIBE service;" """)
print(stdout.read().decode())

print("=== ALL ROWS FROM service (lowercase) ===")
stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM service\\G" """)
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
