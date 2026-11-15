with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos1 = text.find('<!-- FLOATING LIVE CHAT CIRCULAR BUTTON')
pos2 = text.find('</a>', pos1) + 4
print(text[pos1:pos2])
