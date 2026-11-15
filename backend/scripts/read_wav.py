import wave

for path in [
    r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.user_uploaded\uploaded_media_1794250130678.wav',
    r'C:\Users\faruk\.gemini\antigravity\brain\d16c6fd4-6ca5-443d-98ff-29eccb0892d3\.user_uploaded\uploaded_media_1794250137579.wav'
]:
    with wave.open(path, 'rb') as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        duration = frames / float(rate)
        print(path, f"{duration:.2f}s", f"rate={rate}", f"channels={wf.getnchannels()}")
