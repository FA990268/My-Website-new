import urllib.request
import json

req = urllib.request.urlopen('http://localhost:8000/api/exams')
data = json.loads(req.read().decode('utf-8'))
print(f"Total exams: {len(data)}")
for i, ex in enumerate(data):
    print(f"{i+1}. id={ex.get('id')} title={ex.get('title')} isActive={ex.get('isActive')}")
