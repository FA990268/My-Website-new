import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        calls = data.get("tool_calls")
        if calls:
            for call in calls:
                if call.get("name") in ["write_file", "edit_file"]:
                    path = call.get("args", {}).get("Path", "")
                    if "server.py" in path:
                        print(f"Step {data.get('step_index')}: {path}")
