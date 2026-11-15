import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos1 = text.find('function saveExamToDB')
print('=== saveExamToDB ===')
print(text[pos1:pos1+1500])

pos2 = text.find('function saveCbtExamToDB')
print('\n=== saveCbtExamToDB ===')
print(text[pos2:pos2+1500])
