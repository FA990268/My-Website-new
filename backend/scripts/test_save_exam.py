import urllib.request
import json

payload = {
    "title": "JFT-Basic Model CBT Test (Verified Live)",
    "passMark": 200,
    "duration": 60,
    "questions": [
        {
            "section": "Section 1: Script and Vocabulary",
            "question": "Sample Question 1",
            "options": ["A", "B", "C", "D"],
            "correct": 1,
            "mark": 5
        }
    ]
}

req = urllib.request.Request(
    'http://localhost:8000/api/exams',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("Save Exam API Response:", res)

# Verify GET /api/exams
with urllib.request.urlopen('http://localhost:8000/api/exams') as resp:
    exams = json.loads(resp.read().decode('utf-8'))
    print(f"Total exams in server: {len(exams)}")
    for e in exams:
        print(f"- {e.get('id')}: {e.get('title')}")
