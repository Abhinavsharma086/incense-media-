import urllib.request
import os
import json

zip_path = r'c:\xampp\htdocs\incenseMediaAdminCode\deploy_package.zip'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

print(f"Reading {zip_path} ({os.path.getsize(zip_path)/(1024*1024):.2f} MB)...")
with open(zip_path, 'rb') as f:
    file_bytes = f.read()

header = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="deploy_package.zip"\r\nContent-Type: application/zip\r\n\r\n'.encode('utf-8')
footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = header + file_bytes + footer

req = urllib.request.Request(
    'https://admin.incensemedia.in/admin/upload',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
)

print("Uploading deploy_package.zip directly to live server...")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = resp.read().decode('utf-8')
        print('Upload response:', result)
        data = json.loads(result)
        if data.get('success'):
            print(f"\n[+] SUCCESS! File uploaded to live server at: {data['url']}")
except Exception as e:
    print('Upload error:', e)
