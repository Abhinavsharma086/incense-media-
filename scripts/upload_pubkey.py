import urllib.request
import json
import os

boundary = '----BoundaryKeyUpload2026'
key_path = r'c:\xampp\htdocs\incenseMediaAdminCode\scripts\deploy_key.pub'

with open(key_path, 'rb') as f:
    key_bytes = f.read()

header = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="title"\r\n\r\n'
    f'Deploy Key Pub\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="banner"; filename="deploy_key.pub"\r\n'
    f'Content-Type: text/plain\r\n\r\n'
).encode('utf-8')
footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = header + key_bytes + footer

req = urllib.request.Request(
    'https://admin.incensemedia.in/api/services',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

with urllib.request.urlopen(req, timeout=30) as resp:
    res = json.loads(resp.read().decode())
    uploaded_name = res.get('data', {}).get('banner')
    print('KEY_UPLOADED_AS:', uploaded_name)
