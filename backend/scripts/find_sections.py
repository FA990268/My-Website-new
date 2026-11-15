with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<section[^>]*id="([^"]+)"', text)
print("Section IDs:", matches)

main_matches = re.findall(r'<main[^>]*id="([^"]+)"', text)
print("Main IDs:", main_matches)
