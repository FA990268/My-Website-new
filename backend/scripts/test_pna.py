import urllib.request

req = urllib.request.Request(
    'http://localhost:8000/api/tts/batch-dialogue',
    method='OPTIONS',
    headers={
        'Origin': 'null',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        'Access-Control-Request-Private-Network': 'true'
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Headers:", dict(resp.headers))
except Exception as e:
    print("Error:", e)
