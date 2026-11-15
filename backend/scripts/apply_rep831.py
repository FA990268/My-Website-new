with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos1 = text.find('@app.post("/api/exams/submit")')
pos2 = text.find('@app.get("/api/download/sample-json")')

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\finish_rebuild.py', 'r', encoding='utf-8') as f:
    code = f.read()
rep_pos = code.find('replacement831 = """') + len('replacement831 = """')
rep_end = code.find('"""\n\nif target831 in server_code:')
replacement = code[rep_pos:rep_end]

text = text[:pos1] + replacement + '\n\n' + text[pos2:]

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied PostgreSQL endpoints successfully!")
