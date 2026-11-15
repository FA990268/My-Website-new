with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step_server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'lan_ip|get_ip|ip', text)]
for m in matches[:10]:
    print(text[m-20:m+60])
