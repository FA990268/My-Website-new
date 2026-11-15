with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('</section>\n\n        <!-- Feature Highlights Grid -->')
print("Position:", pos)
if pos == -1:
    pos = text.find('<!-- Feature Highlights Grid -->')
    print("Feature highlights pos:", pos)
    print(text[pos-200:pos+100])
