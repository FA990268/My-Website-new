import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        calls = data.get("tool_calls")
        if calls:
            for c in calls:
                p = c.get("args", {}).get("Path", "")
                if "jft-cbt-exam-server" in p and "server.py" in p and c.get("name") == "write_file":
                    print(f"Step {data.get('step_index')}: {p}")
                    content = c.get("args", {}).get("Content")
                    if content and len(content) > 5000:
                        with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step_server.py', 'w', encoding='utf-8') as out:
                            out.write(content)
                        print("Saved step_server.py, length:", len(content))
