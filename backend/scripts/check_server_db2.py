with open(r'C:\Users\faruk\.gemini\antigravity\scratch\ttsmaker-studio\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'5432|postgres|jft_exam_db', text)]
for m in matches:
    print(text[m-20:m+100])
    print('---')
