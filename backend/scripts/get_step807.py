import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 807:
            calls = data.get("tool_calls")
            for c in calls:
                print(c.get("name"), c.get("args", {}).get("Path"))
                content = c.get("args", {}).get("Content")
                if content:
                    print("Length:", len(content))
                    with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step807_server.py', 'w', encoding='utf-8') as out:
                        out.write(content)
