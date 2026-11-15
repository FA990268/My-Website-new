with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

for fn in ['updateGlobalBg', 'resetGlobalBg', 'saveExamToDB', 'saveCbtExam', 'checkStored']:
    pos = text.find('function ' + fn)
    if pos != -1:
        print('=== ' + fn + ' ===')
        print(text[pos:pos+400])
