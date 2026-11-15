with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'mount|StaticFiles|index\.html', text)]
for m in matches:
    print(text[m-30:m+100])
    print('---')
