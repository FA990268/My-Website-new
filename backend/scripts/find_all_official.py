import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('OFFICIAL EXAM SIMULATION')
while pos != -1:
    print(pos, text[pos-30:pos+80])
    pos = text.find('OFFICIAL EXAM SIMULATION', pos+1)
