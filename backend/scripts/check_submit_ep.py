with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'/api/submit-exam|/api/exams/submit|save_exam_submission', text)]
for m in matches:
    print(text[m-20:m+100])
if not matches:
    print("No submit endpoints found!")
