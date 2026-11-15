with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

print('Admin panel style found:', '#admin-panel {' in text)
print('Old bg-slate-950/95 in admin:', 'bg-slate-950/95' in text)
for i, line in enumerate(text.splitlines()):
    if 'id="admin-panel"' in line:
        print(f'Line {i+1}: {line}')
    if 'id="view-mock"' in line:
        print(f'Line {i+1}: {line}')
