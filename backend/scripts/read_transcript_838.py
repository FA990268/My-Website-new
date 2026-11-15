import json

with open(r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") in [836, 837, 838]:
            print(f"STEP {data.get('step_index')}:", data.get("tool_calls"))
