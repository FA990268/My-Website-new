with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('/api/exams')
while pos != -1:
    print(text[pos-20:pos+80])
    print('---')
    pos = text.find('/api/exams', pos+1)
