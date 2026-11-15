with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('/api/tts/batch-dialogue')
print("Found /api/tts/batch-dialogue in server.py:", pos)
if pos != -1:
    print(text[pos-50:pos+300])
