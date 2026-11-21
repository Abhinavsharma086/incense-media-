import urllib.request
import json
import os

zip_path = r'c:\xampp\htdocs\incenseMediaAdminCode\deploy_package.zip'
sh_path = r'c:\xampp\htdocs\incenseMediaAdminCode\scripts\deploy_on_server.sh'

boundary = '----BoundaryDeploy2026'

def upload_file(file_path, filename):
    print(f"[*] Reading {file_path} ({os.path.getsize(file_path)/(1024*1024):.2f} MB)...")
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    header = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="title"\r\n\r\n'
        f'Deploy Artifact {filename}\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="banner"; filename="{filename}"\r\n'
        f'Content-Type: application/octet-stream\r\n\r\n'
    ).encode('utf-8')
    footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
    body = header + file_bytes + footer

    req = urllib.request.Request(
        'https://admin.incensemedia.in/api/services',
        data=body,
        headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    )

    print(f"[*] Uploading {filename} to live server via /api/services...")
    with urllib.request.urlopen(req, timeout=180) as resp:
        res = resp.read().decode('utf-8')
        data = json.loads(res)
        server_filename = data.get('data', {}).get('banner')
        print(f"[+] SUCCESS! {filename} -> /var/www/crm-backend/uploads/{server_filename}")
        return server_filename

if __name__ == '__main__':
    sh_uploaded = upload_file(sh_path, "deploy_on_server.sh")
    zip_uploaded = upload_file(zip_path, "deploy_package.zip")
    print("\n=======================================================")
    print(f"Uploaded Deploy Script: /var/www/crm-backend/uploads/{sh_uploaded}")
    print(f"Uploaded Deploy Zip:    /var/www/crm-backend/uploads/{zip_uploaded}")
    print("=======================================================")
