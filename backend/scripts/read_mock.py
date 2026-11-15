import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('function renderMockTestsView')
print(text[pos+4500:pos+6500])
