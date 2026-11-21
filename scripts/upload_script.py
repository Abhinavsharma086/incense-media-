import urllib.request
import json

path = r'c:\xampp\htdocs\incenseMediaAdminCode\scripts\deploy_on_server.sh'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

with open(path, 'rb') as f:
    file_bytes = f.read()

header = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="deploy_on_server.sh"\r\n'
    f'Content-Type: application/x-sh\r\n\r\n'
).encode('utf-8')

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

with urllib.request.urlopen(req) as resp:
    res = resp.read().decode('utf-8')
    print('Deploy script uploaded:', res)
