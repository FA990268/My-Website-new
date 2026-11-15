import urllib.request
import json

payload = {
    "title": "Unified CBT Dialogue Synthesis",
    "speaker_map": {"Speaker 1": "ja-JP-NanamiNeural"},
    "pause_seconds": 0.5,
    "scripts": [
        {
            "id": "test_script_1",
            "title": "Conversation 1",
            "targetAudio": "a.mp3",
            "dialogues": [
                {
                    "speaker": "Speaker 1",
                    "text": "こんにちは"
                }
            ]
        }
    ]
}

req = urllib.request.Request(
    'http://localhost:8000/api/tts/batch-dialogue',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Origin': 'null'}
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Success:", data.get('success'))
        print("Scripts count:", len(data.get('scripts', [])))
        if data.get('scripts'):
            print("First script master audio:", data['scripts'][0].get('masterAudio'))
except Exception as e:
    print("Error:", e)
