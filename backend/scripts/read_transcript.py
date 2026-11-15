import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines[-5:]:
    data = json.loads(line)
    print("STEP:", data.get("step_index"), data.get("type"), data.get("source"))
    if "content" in data:
        print("CONTENT:", str(data["content"])[:300])
