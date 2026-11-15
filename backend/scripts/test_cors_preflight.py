import urllib.request

req = urllib.request.Request(
    'http://localhost:8000/api/tts/batch-dialogue',
    method='OPTIONS',
    headers={
        'Origin': 'null',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Headers:", dict(resp.headers))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.reason)
    print("Headers:", dict(e.headers))
except Exception as e:
    print("Error:", e)
