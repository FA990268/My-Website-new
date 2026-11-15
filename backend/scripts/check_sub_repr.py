with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('/api/exams/submit')
print(repr(text[pos-20:pos+800]))
