import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if "jft_exam_db" in line and "CREATE TABLE" in line:
            data = json.loads(line)
            print(f"Step {data.get('step_index')}: found schema definition!")
            calls = data.get("tool_calls")
            if calls:
                for c in calls:
                    content = c.get("args", {}).get("Content")
                    if content and "psycopg2" in content:
                        print("Saving server code...")
                        with open(r'C:\Users\faruk\.gemini\antigravity\scratch\recovered_server.py', 'w', encoding='utf-8') as out:
                            out.write(content)
                        break
