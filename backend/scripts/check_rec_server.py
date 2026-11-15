with open(r'C:\Users\faruk\.gemini\antigravity\scratch\recovered_server.py', 'r', encoding='utf-8') as f:
    text = f.read()

print("Recovered server length:", len(text))
pos = text.find('init_postgres_db')
print(text[pos:pos+1500])
