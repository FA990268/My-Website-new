with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("home-exams-container found:", "id=\"home-exams-container\"" in text)
print("renderHomeExams defined:", "function renderHomeExams" in text)
print("filterHomeExams defined:", "function filterHomeExams" in text)
for i, line in enumerate(text.splitlines()):
    if "renderHomeExams" in line:
        print(f"Line {i+1}: {line.strip()[:80]}")
