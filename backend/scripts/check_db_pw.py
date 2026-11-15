with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step807_server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'password', text, re.IGNORECASE)]
for m in matches:
    print(text[m-30:m+60])
