import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 831:
            calls = data.get("tool_calls")
            for c in calls:
                content = c.get("args", {}).get("Content")
                if content:
                    print("Found server.py content, length:", len(content))
                    with open(r'C:\Users\faruk\.gemini\antigravity\scratch\recovered_server.py', 'w', encoding='utf-8') as out:
                        out.write(content)
                    print("Saved to recovered_server.py")
