import os
import shutil

target_dir = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server'
os.makedirs(target_dir, exist_ok=True)
os.makedirs(os.path.join(target_dir, 'static'), exist_ok=True)
os.makedirs(os.path.join(target_dir, 'data'), exist_ok=True)
os.makedirs(os.path.join(target_dir, 'audio'), exist_ok=True)
os.makedirs(os.path.join(target_dir, 'submissions_backup'), exist_ok=True)

# 1. Update and write db.py
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step807_server.py', 'r', encoding='utf-8') as f:
    db_code = f.read()

# Replace DB_PASS default
db_code = db_code.replace('DB_PASS = os.getenv("DB_PASS", "postgres")', 'DB_PASS = os.getenv("DB_PASS", "990268moon")')
db_code = db_code.replace('password="990268"', 'password="990268moon"')

with open(os.path.join(target_dir, 'db.py'), 'w', encoding='utf-8') as f:
    f.write(db_code)
print("Wrote db.py with 990268moon password!")

# 2. Reconstruct server.py
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step_server.py', 'r', encoding='utf-8') as f:
    server_code = f.read()

# Apply edits 827 & 831
with open(r'C:\Users\faruk\.gemini\antigravity\scratch\read_edits.py', 'r', encoding='utf-8') as f:
    pass # we already know the replacements

# Let's inspect step_server.py to see if it already has db imported
print("db in step_server.py:", "import db" in server_code)
print("submit-exam in step_server.py:", "/api/submit-exam" in server_code)
