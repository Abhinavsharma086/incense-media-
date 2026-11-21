import paramiko
import os
import sys

host = "2001:67c:2b0:db32::1f61:cd10"

print("==================================================")
print(f"Connecting to Live VPS via IPv6 [{host}]...")
print("==================================================")

# 1. Test SSH Keys
key_files = [
    r"c:\xampp\htdocs\incenseMediaAdminCode\scripts\deploy_key",
    r"C:\Users\a1807\.ssh\id_rsa",
    r"C:\Users\a1807\.ssh\id_rsa_live",
    r"C:\Users\a1807\.ssh\id_rsa_livemcmk",
]

for k_path in key_files:
    if not os.path.exists(k_path):
        continue
    try:
        pkey = paramiko.RSAKey.from_private_key_file(k_path)
    except Exception:
        continue

    for u in ["root", "deploy"]:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            print(f"[*] Trying Key '{os.path.basename(k_path)}' as '{u}'...", end=" ", flush=True)
            c.connect(host, port=22, username=u, pkey=pkey, timeout=6)
            print(f"\n[+] SUCCESSFUL LOGIN with key as {u}!")
            stdin, stdout, stderr = c.exec_command("whoami; hostname; pwd; uptime")
            print(stdout.read().decode())
            c.close()
            sys.exit(0)
        except Exception as e:
            print(f"Failed ({e})")
        finally:
            c.close()

# 2. Test Passwords
creds = [
    ("root", "?3ZD79d854Z4AMH-EFW"),
    ("root", "?3ZD79d854Z4AMH-EFWn"),
    ("root", "3ZD79d854Z4AMH-EFW"),
    ("root", "Body&=-9lg!1louwsell_MD"),
    ("deploy", "MLN5~3Gg-WJb9&'"),
    ("deploy", "MLN5~3Gg-Wb9&'"),
    ("deploy", "MLN5~3Gg-WJb9&"),
    ("deploy", "?3ZD79d854Z4AMH-EFW"),
    ("deploy", "Body&=-9lg!1louwsell_MD"),
]

for u, p in creds:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"[*] Trying password '{p[:6]}***' as '{u}'...", end=" ", flush=True)
        c.connect(host, port=22, username=u, password=p, timeout=6)
        print(f"\n[+] SUCCESSFUL LOGIN as {u}!")
        stdin, stdout, stderr = c.exec_command("whoami; hostname; pwd; uptime")
        print(stdout.read().decode())
        c.close()
        sys.exit(0)
    except Exception as e:
        print(f"Failed ({e})")
    finally:
        c.close()

print("\n[-] All credentials failed.")
