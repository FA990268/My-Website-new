import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") in [826, 827, 828, 829, 830, 831, 832]:
            calls = data.get("tool_calls")
            if calls:
                for c in calls:
                    print(f"Step {data.get('step_index')}: {c.get('name')} {c.get('args', {}).get('Path')}")
