with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'allExams\[|allExams\.', text)]
for m in matches:
    print(text[m-20:m+120])
    print('---')
