import shutil

src = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'
dest1 = r'C:\Users\faruk\Desktop\Jft Test\index.html'
dest2 = r'C:\Users\faruk\Desktop\1.html'

shutil.copy2(src, dest1)
print(f"Copied to {dest1}")
shutil.copy2(src, dest2)
print(f"Copied to {dest2}")
