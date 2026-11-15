import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") in [827, 831]:
            calls = data.get("tool_calls")
            for c in calls:
                print(f"Step {data.get('step_index')}:")
                print("Target:", repr(c.get("args", {}).get("Target")))
                print("Replacement:", repr(c.get("args", {}).get("Replacement")))
