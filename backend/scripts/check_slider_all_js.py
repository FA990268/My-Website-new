import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos1 = text.find('function renderHomeSlider')
pos2 = text.find('// --- MOCK TESTS VIEW RENDERING ---')
print(text[pos1:pos2])
