with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

marker = "os.makedirs(ASSETS_DIR, exist_ok=True)"
mount_code = """os.makedirs(ASSETS_DIR, exist_ok=True)

@app.get("/")
async def root_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "JFT-Basic CBT Server Running"}

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
if os.path.exists(DATA_DIR):
    app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
if os.path.exists(AUDIO_DIR):
    app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")"""

text = text.replace(marker, mount_code, 1)

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added static file mounts and root handler to server.py!")
