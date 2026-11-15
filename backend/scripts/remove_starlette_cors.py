with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)"""

text = text.replace(old_block, "# Handled by custom high-compatibility CORS & PNA middleware")

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Removed Starlette CORSMiddleware to let custom PNA middleware handle all requests!")
