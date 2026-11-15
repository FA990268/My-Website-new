import os

p = r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.user_uploaded'
if os.path.exists(p):
    files = sorted(os.listdir(p), key=lambda x: os.path.getmtime(os.path.join(p, x)), reverse=True)
    for f in files[:10]:
        print(f, os.path.getsize(os.path.join(p, f)))
else:
    print("Folder does not exist")
