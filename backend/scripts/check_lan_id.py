with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

print('current-lan-ip in HTML:', 'id="current-lan-ip"' in text)
print('modal-lan-url in HTML:', 'id="modal-lan-url"' in text)
