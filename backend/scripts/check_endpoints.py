with open(r'C:\Users\faruk\.gemini\antigravity\scratch\ttsmaker-studio\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'@app\.(?:get|post|put|delete)\("([^"]+)"\)', text)
print("Endpoints in ttsmaker-studio server.py:", matches)
