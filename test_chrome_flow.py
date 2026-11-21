import subprocess, time, json, urllib.request

cmd = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    'about:blank'
]
proc = subprocess.Popen(cmd)
time.sleep(2)
try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
    print("Initial tabs count:", len(tabs))
    for t in tabs:
        print("Tab:", t.get('title'), t.get('url'))
finally:
    proc.terminate()
