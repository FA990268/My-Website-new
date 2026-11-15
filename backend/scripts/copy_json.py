import os
import shutil

src_desktop = r'C:\Users\faruk\Desktop\Jft Test'
static_data = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\data'
os.makedirs(static_data, exist_ok=True)

for item in os.listdir(src_desktop):
    if item.endswith('.json'):
        shutil.copy2(os.path.join(src_desktop, item), os.path.join(static_data, item))
        print("Copied to static/data:", item)
