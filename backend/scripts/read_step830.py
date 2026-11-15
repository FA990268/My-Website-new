import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 830:
            content = data.get("content")
            print("Step 830 content length:", len(str(content)))
            with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step830.txt', 'w', encoding='utf-8') as out:
                out.write(str(content))
