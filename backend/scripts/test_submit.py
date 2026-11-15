import urllib.request
import json

payload = {
    "candidate_id": "TEST-CAND-001",
    "candidate_name": "Faruk Hossain",
    "exam_title": "JFT-Basic Model CBT Test",
    "password": "pass",
    "questions": [
        {
            "section": "Section 1",
            "question": "Sample Question 1",
            "selected_option": 1,
            "correct_option": 1,
            "mark": 5,
            "is_correct": True
        }
    ]
}

req = urllib.request.Request(
    'http://localhost:8000/api/submit-exam',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("Submit Exam Response:", res)
