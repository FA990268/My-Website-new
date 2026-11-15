with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('function saveCbtExamToDB')
print(text[pos-10:pos+150])
