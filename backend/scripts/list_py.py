import os

p = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server'
for root, dirs, files in os.walk(p):
    for f in files:
        if f.endswith('.py'):
            print(os.path.join(root, f))
