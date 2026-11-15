import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos1 = text.find('id="home-slider-wrap"')
pos2 = text.find('<!-- Feature Highlights Grid -->')
print(text[pos1-60:pos2])
