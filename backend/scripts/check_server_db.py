with open(r'C:\Users\faruk\.gemini\antigravity\scratch\ttsmaker-studio\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'postgres|psycopg2|database|pg_|password', text, re.IGNORECASE)]
for m in matches:
    print(text[m-30:m+100])
    print('---')
