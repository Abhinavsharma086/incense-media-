import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("2a02:4780:12:c8b::1", port=22, username='deploy', password="MLN5~3Gg-WJb9&'", timeout=15)

stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM Services WHERE title LIKE '%Aroma%' OR title LIKE '%Consult%';" """)
print("SEARCH IN Services:")
print(stdout.read().decode('utf-8', errors='ignore'))

stdin, stdout, stderr = ssh.exec_command("""mysql -u incense_user -p'rROdU&=-Q]G!1lQUWce{(_MD' incense_db -e "SELECT * FROM service WHERE title LIKE '%Aroma%' OR title LIKE '%Consult%';" """)
print("SEARCH IN service:")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
