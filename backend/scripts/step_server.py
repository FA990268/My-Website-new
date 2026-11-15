import os
import re
import sys
import uuid
import json
import socket
import asyncio
import logging
from typing import Optional, List, Dict, Any, Union
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import edge_tts

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jft_cbt_server")

app = FastAPI(title="JFT-Basic Prometric CBT & Multi-Speaker TTS Server", version="3.0.0")

# Enable CORS for multi-user local LAN access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
AUDIO_DIR = os.path.join(STATIC_DIR, "audio")
DATA_DIR = os.path.join(STATIC_DIR, "data")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

# Standard MPEG-2 Layer 3 Mono 24kHz / 48kbps silent frame (144 bytes)
SILENT_FRAME = bytes.fromhex('fff364c47c0000034800000000' + '55' * 131)

def get_silence_bytes(seconds: float) -> bytes:
    """Returns exact silent MP3 frames for natural inter-dialogue pauses."""
    if seconds <= 0:
        return b""
    num_frames = int(round(seconds / 0.024))
    return SILENT_FRAME * num_frames

# Custom Neural Voice Profiles
CUSTOM_VOICES = {
    "ja-JP-DaichiNeural": {
        "base_voice": "ja-JP-KeitaNeural",
        "pitch_offset": -12,
        "rate_offset": -4,
        "name": "Daichi (大智)",
        "gender": "Male",
        "role_category": "male",
        "role_label": "👨 Adult Male (成人男性・ナレーター)",
        "locale": "ja-JP",
    },
    "ja-JP-KeitaNeural": {
        "base_voice": "ja-JP-KeitaNeural",
        "pitch_offset": 0,
        "rate_offset": 0,
        "name": "Keita (圭太)",
        "gender": "Male",
        "role_category": "male",
        "role_label": "👨 Adult Male (成人男性・標準)",
        "locale": "ja-JP",
    },
    "ja-JP-AoiNeural": {
        "base_voice": "ja-JP-NanamiNeural",
        "pitch_offset": -5,
        "rate_offset": -4,
        "name": "Aoi (葵)",
        "gender": "Female",
        "role_category": "female",
        "role_label": "👩 Adult Female (成人女性・店員・案内)",
        "locale": "ja-JP",
    },
    "ja-JP-NanamiNeural": {
        "base_voice": "ja-JP-NanamiNeural",
        "pitch_offset": 0,
        "rate_offset": 0,
        "name": "Nanami (七海)",
        "gender": "Female",
        "role_category": "female",
        "role_label": "👩 Adult Female (成人女性・標準)",
        "locale": "ja-JP",
    },
    "ja-JP-RenChildNeural": {
        "base_voice": "ja-JP-KeitaNeural",
        "pitch_offset": 28,
        "rate_offset": 10,
        "name": "Ren (蓮・男の子)",
        "gender": "Children Male",
        "role_category": "boy",
        "role_label": "👦 Child Boy (少年・男の子)",
        "locale": "ja-JP",
    },
    "ja-JP-YunaChildNeural": {
        "base_voice": "ja-JP-NanamiNeural",
        "pitch_offset": 26,
        "rate_offset": 8,
        "name": "Yuna (由奈・女の子)",
        "gender": "Children Female",
        "role_category": "girl",
        "role_label": "👧 Child Girl (少女・女の子)",
        "locale": "ja-JP",
    },
    "en-US-GuyNeural": {
        "base_voice": "en-US-GuyNeural",
        "pitch_offset": 0,
        "rate_offset": 0,
        "name": "Guy (Male English)",
        "gender": "Male",
        "role_category": "male",
        "role_label": "👨 Adult Male (English)",
        "locale": "en-US",
    },
    "en-US-JennyNeural": {
        "base_voice": "en-US-JennyNeural",
        "pitch_offset": 0,
        "rate_offset": 0,
        "name": "Jenny (Female English)",
        "gender": "Female",
        "role_category": "female",
        "role_label": "👩 Adult Female (English)",
        "locale": "en-US",
    },
    "en-US-LeoBoyNeural": {
        "base_voice": "en-US-GuyNeural",
        "pitch_offset": 30,
        "rate_offset": 10,
        "name": "Leo (Boy English)",
        "gender": "Children Male",
        "role_category": "boy",
        "role_label": "👦 Child Boy (English)",
        "locale": "en-US",
    },
    "en-US-MiaGirlNeural": {
        "base_voice": "en-US-JennyNeural",
        "pitch_offset": 28,
        "rate_offset": 8,
        "name": "Mia (Girl English)",
        "gender": "Children Female",
        "role_category": "girl",
        "role_label": "👧 Child Girl (English)",
        "locale": "en-US",
    },
}

def resolve_voice_params(voice_id: str, rate_val: float = 1.0, pitch_val: int = 0, vol_val: float = 1.0):
    cfg = CUSTOM_VOICES.get(voice_id)
    if cfg:
        base_voice = cfg["base_voice"]
        eff_pitch = pitch_val + cfg.get("pitch_offset", 0)
        eff_rate_percent = int(round((rate_val - 1.0) * 100)) + cfg.get("rate_offset", 0)
    else:
        base_voice = voice_id
        eff_pitch = pitch_val
        eff_rate_percent = int(round((rate_val - 1.0) * 100))

    rate_str = f"{eff_rate_percent:+d}%"
    pitch_str = f"{eff_pitch:+d}Hz"
    vol_percent = int(round((vol_val - 1.0) * 100))
    vol_str = f"{vol_percent:+d}%"
    return base_voice, rate_str, pitch_str, vol_str

def parse_speaker_role(speaker_name: str) -> Dict[str, str]:
    """
    Intelligently analyzes speaker text/label to assign role and default neural voice:
    Male, Female, or Child (Boy/Girl).
    """
    s = speaker_name.lower().strip()

    # Child boy keywords
    if any(k in s for k in ["ren", "leo", "蓮", "男の子", "少年", "boy", "son", "息子", "こども(男)"]):
        return {
            "role_category": "boy",
            "role_label": "👦 Child Boy (男の子・少年)",
            "voice_id": "ja-JP-RenChildNeural"
        }

    # Child girl keywords
    if any(k in s for k in ["yuna", "mia", "由奈", "女の子", "少女", "girl", "daughter", "娘", "こども(女)"]):
        return {
            "role_category": "girl",
            "role_label": "👧 Child Girl (女の子・少女)",
            "voice_id": "ja-JP-YunaChildNeural"
        }

    # General child
    if any(k in s for k in ["child", "kid", "子供", "こども", "児童"]):
        return {
            "role_category": "boy",
            "role_label": "👦 Child (子供)",
            "voice_id": "ja-JP-RenChildNeural"
        }

    # Female keywords
    if any(k in s for k in ["女", "おんな", "female", "woman", "mama", "mother", "店員", "客(女)", "girl", "aoi", "nanami", "jenny", "さくら", "はるこ", "母", "お母さん"]):
        return {
            "role_category": "female",
            "role_label": "👩 Adult Female (女性・店員)",
            "voice_id": "ja-JP-AoiNeural"
        }

    # Male keywords
    if any(k in s for k in ["男", "おとこ", "male", "man", "papa", "father", "父", "お父さん", "客(男)", "host", "guest", "daichi", "keita", "guy", "山田", "田中"]):
        return {
            "role_category": "male",
            "role_label": "👨 Adult Male (男性・ナレーター)",
            "voice_id": "ja-JP-DaichiNeural"
        }

    # Default fallback: check if speaker is "A" or "B"
    if s == "b" or "b:" in s:
        return {
            "role_category": "female",
            "role_label": "👩 Female (Speaker B)",
            "voice_id": "ja-JP-AoiNeural"
        }
    return {
        "role_category": "male",
        "role_label": "👨 Male (Speaker A)",
        "voice_id": "ja-JP-DaichiNeural"
    }

def get_lan_ips() -> List[str]:
    """Retrieves all active non-loopback IPv4 addresses of this host machine."""
    ips = []
    try:
        host_name = socket.gethostname()
        for ip in socket.gethostbyname_ex(host_name)[2]:
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass

    # Fallback using UDP socket route trick
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and primary_ip not in ips and not primary_ip.startswith("127."):
            ips.insert(0, primary_ip)
    except Exception:
        pass
    return ips

# --- Pydantic Request Models ---
class DialogueTurnModel(BaseModel):
    id: Optional[Union[str, int]] = None
    speaker: str
    text: str
    voice: Optional[str] = None
    rate: Optional[float] = 1.0
    pitch: Optional[int] = 0

class DialogueScriptModel(BaseModel):
    id: Optional[str] = None
    dialogueId: Optional[str] = None
    title: Optional[str] = None
    targetAudio: Optional[str] = None
    dialogues: List[DialogueTurnModel]

class BatchScriptsRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    speaker_map: Optional[Dict[str, Any]] = None
    pause_seconds: Optional[float] = 0.8
    scripts: List[DialogueScriptModel]

class SingleTurnRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "ja-JP-DaichiNeural"
    rate: Optional[float] = 1.0
    pitch: Optional[int] = 0
    speaker: Optional[str] = "Speaker"

class ExamSubmissionModel(BaseModel):
    studentName: str
    regNo: str
    dob: Optional[str] = ""
    location: Optional[str] = ""
    examTitle: str
    totalScore: int
    maxScore: int = 250
    passMark: int = 200
    isPassed: bool
    sections: List[Dict[str, Any]]
    date: Optional[str] = None

# --- API Endpoints ---

@app.get("/api/network-info")
async def get_network_info():
    """Returns local host and LAN network access URLs for multi-device exam usage."""
    ips = get_lan_ips()
    port = 8000
    lan_urls = [f"http://{ip}:{port}" for ip in ips]
    return {
        "hostname": socket.gethostname(),
        "local_url": f"http://localhost:{port}",
        "primary_lan_url": lan_urls[0] if lan_urls else f"http://localhost:{port}",
        "all_lan_urls": lan_urls,
        "port": port
    }

@app.get("/api/voices")
async def get_voices():
    """Returns catalog of custom Japanese and English voice profiles with role categories."""
    return list(CUSTOM_VOICES.values())

def normalize_dialogue_json_data(raw_data: Any) -> List[Dict[str, Any]]:
    """Converts uploaded JSON into standard scripts array format."""
    raw_scripts = []
    if isinstance(raw_data, list):
        raw_scripts = raw_data
    elif isinstance(raw_data, dict):
        if "scripts" in raw_data and isinstance(raw_data["scripts"], list):
            raw_scripts = raw_data["scripts"]
        elif "dialogues" in raw_data and isinstance(raw_data["dialogues"], list):
            raw_scripts = [raw_data]
        elif "data" in raw_data and isinstance(raw_data["data"], list):
            raw_scripts = raw_data["data"]
        else:
            raise ValueError("No 'scripts' or 'dialogues' array found in JSON.")

    normalized = []
    for s_idx, s in enumerate(raw_scripts):
        s_id = s.get("id") or s.get("dialogueId") or f"script_{s_idx+1}"
        s_title = s.get("title") or s.get("name") or f"Script #{s_idx+1}"
        target_audio = s.get("targetAudio") or (s_id if str(s_id).endswith(".mp3") else f"{s_id}.mp3")

        raw_turns = s.get("dialogues") or s.get("turns") or s.get("lines") or []
        dialogues = []
        for t_idx, t in enumerate(raw_turns):
            turn_id = t.get("id") or f"{s_id}_t{t_idx+1}"
            speaker = str(t.get("speaker") or t.get("role") or t.get("character") or "Speaker").strip()
            text = str(t.get("text") or t.get("dialogue") or t.get("line") or "").strip()
            if not text:
                continue
            dialogues.append({
                "id": turn_id,
                "speaker": speaker,
                "text": text,
                "voice": t.get("voice"),
                "rate": t.get("rate", 1.0),
                "pitch": t.get("pitch", 0)
            })

        normalized.append({
            "id": s_id,
            "dialogueId": s.get("dialogueId") or s_id,
            "title": s_title,
            "targetAudio": target_audio,
            "dialogues": dialogues
        })
    return normalized

@app.post("/api/scripts/parse")
async def parse_scripts_endpoint(file: Optional[UploadFile] = File(None), raw_json: Optional[str] = None):
    """Parses uploaded JSON script file or raw text, detects roles and speakers."""
    try:
        if file:
            content = await file.read()
            text = content.decode("utf-8-sig", errors="replace")
            data = json.loads(text)
        elif raw_json:
            data = json.loads(raw_json)
        else:
            raise HTTPException(status_code=400, detail="No file or JSON string provided.")

        scripts = normalize_dialogue_json_data(data)
        if not scripts:
            raise HTTPException(status_code=400, detail="No valid scripts found in payload.")

        # Extract unique speakers & auto-assign voice profiles
        speaker_roles = {}
        for script in scripts:
            for turn in script["dialogues"]:
                spk = turn["speaker"]
                if spk not in speaker_roles:
                    speaker_roles[spk] = parse_speaker_role(spk)

        total_turns = sum(len(s["dialogues"]) for s in scripts)
        return {
            "success": True,
            "scriptsCount": len(scripts),
            "totalTurns": total_turns,
            "speakerRoles": speaker_roles,
            "scripts": scripts
        }
    except Exception as e:
        logger.error(f"Error parsing scripts: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse script JSON: {str(e)}")

@app.post("/api/tts/turn")
async def synthesize_single_turn(req: SingleTurnRequest):
    """Synthesizes an individual dialogue line for instant in-browser playback."""
    try:
        voice_id = req.voice_id or "ja-JP-DaichiNeural"
        base_voice, rate_str, pitch_str, vol_str = resolve_voice_params(
            voice_id, req.rate or 1.0, req.pitch or 0
        )
        comm = edge_tts.Communicate(
            text=req.text,
            voice=base_voice,
            rate=rate_str,
            pitch=pitch_str,
            volume=vol_str
        )
        audio_bytes = bytearray()
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                audio_bytes.extend(chunk["data"])

        if not audio_bytes:
            raise ValueError("No audio returned from engine")

        turn_hash = uuid.uuid4().hex[:8]
        filename = f"turn_{turn_hash}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        duration = max(0.4, round(len(audio_bytes) / 6000.0, 1))
        return {
            "success": True,
            "audioUrl": f"/audio/{filename}",
            "filename": filename,
            "duration": duration,
            "sizeKb": round(len(audio_bytes) / 1024.0, 1)
        }
    except Exception as e:
        logger.error(f"Error synthesizing turn: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/batch-dialogue")
async def batch_synthesize_dialogues(req: BatchScriptsRequest):
    """
    Synthesizes all dialogue scripts:
    1. Generates individual line audio for each dialogue turn (for inline playback).
    2. Combines turns per script into a single continuous master audio file with natural pauses.
    3. If targetAudio matches a CBT audio filename (e.g. a.mp3), saves exact named file for test linkage!
    """
    try:
        speaker_map = req.speaker_map or {}
        pause_sec = req.pause_seconds if req.pause_seconds is not None else 0.8
        pause_bytes = get_silence_bytes(pause_sec)

        sem = asyncio.Semaphore(4)  # 4 concurrent streams

        async def synthesize_turn(turn: DialogueTurnModel, script_idx: int, t_idx: int):
            spk = turn.speaker
            role_info = speaker_map.get(spk)
            if isinstance(role_info, dict):
                v_id = role_info.get("voice_id") or role_info.get("voice") or "ja-JP-DaichiNeural"
                v_role = role_info.get("role_label") or "Speaker"
            elif isinstance(role_info, str):
                v_id = role_info
                v_role = "Speaker"
            else:
                detected = parse_speaker_role(spk)
                v_id = detected["voice_id"]
                v_role = detected["role_label"]

            base_voice, rate_str, pitch_str, vol_str = resolve_voice_params(
                v_id, turn.rate or 1.0, turn.pitch or 0
            )

            # Generate individual turn audio
            clean_spk = re.sub(r"[^a-zA-Z0-9_-]", "", spk) or f"spk{t_idx}"
            turn_filename = f"s{script_idx}_t{t_idx+1}_{clean_spk}_{uuid.uuid4().hex[:6]}.mp3"
            turn_path = os.path.join(AUDIO_DIR, turn_filename)

            try:
                async with sem:
                    comm = edge_tts.Communicate(
                        text=turn.text,
                        voice=base_voice,
                        rate=rate_str,
                        pitch=pitch_str,
                        volume=vol_str
                    )
                    audio_bytes = bytearray()
                    async for chunk in comm.stream():
                        if chunk["type"] == "audio":
                            audio_bytes.extend(chunk["data"])

                if not audio_bytes:
                    raise ValueError("Empty audio")

                with open(turn_path, "wb") as f:
                    f.write(audio_bytes)

                duration = max(0.4, round(len(audio_bytes) / 6000.0, 1))
                return {
                    "id": turn.id or f"t_{t_idx+1}",
                    "speaker": spk,
                    "text": turn.text,
                    "voice_id": v_id,
                    "role_label": v_role,
                    "audioUrl": f"/audio/{turn_filename}",
                    "filename": turn_filename,
                    "filepath": turn_path,
                    "audio_bytes": audio_bytes,
                    "duration": duration,
                    "success": True
                }
            except Exception as e:
                logger.error(f"Error on turn {t_idx} ({spk}): {e}")
                return {
                    "id": turn.id or f"t_{t_idx+1}",
                    "speaker": spk,
                    "text": turn.text,
                    "voice_id": v_id,
                    "role_label": v_role,
                    "audioUrl": None,
                    "error": str(e),
                    "audio_bytes": b"",
                    "success": False
                }

        results = []
        for s_idx, script in enumerate(req.scripts):
            turn_tasks = [
                synthesize_turn(turn, s_idx + 1, t_idx)
                for t_idx, turn in enumerate(script.dialogues)
            ]
            synth_turns = await asyncio.gather(*turn_tasks)

            # Consolidate into single continuous master audio file per script
            master_bytes = bytearray()
            valid_turn_results = []
            for t_i, res in enumerate(synth_turns):
                if res.get("success") and res.get("audio_bytes"):
                    master_bytes.extend(res["audio_bytes"])
                    if t_i < len(synth_turns) - 1:
                        master_bytes.extend(pause_bytes)
                # Omit raw bytes from JSON response to save memory
                res_clean = {k: v for k, v in res.items() if k != "audio_bytes"}
                valid_turn_results.append(res_clean)

            master_info = None
            if master_bytes:
                target_name = script.targetAudio or (f"{script.id}.mp3" if str(script.id).endswith(".mp3") else f"script_{s_idx+1}_master.mp3")
                # Clean target name
                safe_target = os.path.basename(target_name)
                master_path = os.path.join(AUDIO_DIR, safe_target)
                with open(master_path, "wb") as mf:
                    mf.write(master_bytes)

                m_dur = max(0.5, round(len(master_bytes) / 6000.0, 1))
                master_info = {
                    "audioUrl": f"/audio/{safe_target}",
                    "filename": safe_target,
                    "duration": m_dur,
                    "sizeKb": round(len(master_bytes) / 1024.0, 1),
                    "turnsCount": len(synth_turns)
                }

            results.append({
                "id": script.id,
                "dialogueId": script.dialogueId,
                "title": script.title,
                "targetAudio": script.targetAudio,
                "masterAudio": master_info,
                "dialogues": valid_turn_results
            })

        return {
            "success": True,
            "scripts": results,
            "message": f"Successfully synthesized {len(results)} dialogue scripts with line audio and continuous master audio."
        }
    except Exception as e:
        logger.error(f"Batch synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Exam DB & Submissions Endpoints ---

@app.get("/api/exams")
async def get_all_exams():
    """Returns saved CBT exams from disk (loads default 40-question exam if none yet)."""
    exam_file = os.path.join(DATA_DIR, "saved_cbt_exams.json")
    if os.path.exists(exam_file):
        try:
            with open(exam_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading exams: {e}")

    # Fallback: load 40Q model test
    default_40q = os.path.join(DATA_DIR, "jft_40q_cbt_test.json")
    if os.path.exists(default_40q):
        with open(default_40q, "r", encoding="utf-8") as f:
            test_data = json.load(f)
            return [{
                "id": "cbt_40q_model_01",
                "title": test_data.get("title", "JFT-Basic Model CBT Test (40 Questions)"),
                "duration": test_data.get("duration", 60),
                "passMark": test_data.get("passMark", 200),
                "questions": test_data.get("questions", [])
            }]
    return []

@app.post("/api/exams")
async def save_cbt_exam(exam: Dict[str, Any]):
    """Saves a new CBT Exam to shared database."""
    exam_file = os.path.join(DATA_DIR, "saved_cbt_exams.json")
    exams = []
    if os.path.exists(exam_file):
        try:
            with open(exam_file, "r", encoding="utf-8") as f:
                exams = json.load(f)
        except Exception:
            exams = []

    if "id" not in exam or not exam["id"]:
        exam["id"] = "cbt_" + uuid.uuid4().hex[:8]

    # Replace if exists or append
    exams = [x for x in exams if x.get("id") != exam["id"]]
    exams.append(exam)

    with open(exam_file, "w", encoding="utf-8") as f:
        json.dump(exams, f, ensure_ascii=False, indent=2)

    return {"success": True, "examId": exam["id"], "totalExams": len(exams)}

@app.post("/api/exams/submit")
async def submit_exam_result(sub: ExamSubmissionModel):
    """Receives and stores student CBT or Model test submissions across the network."""
    sub_file = os.path.join(DATA_DIR, "student_submissions.json")
    submissions = []
    if os.path.exists(sub_file):
        try:
            with open(sub_file, "r", encoding="utf-8") as f:
                submissions = json.load(f)
        except Exception:
            submissions = []

    record = sub.dict()
    record["submissionId"] = "sub_" + uuid.uuid4().hex[:8]
    if not record.get("date"):
        record["date"] = asyncio.get_event_loop().time()
    submissions.insert(0, record)

    with open(sub_file, "w", encoding="utf-8") as f:
        json.dump(submissions, f, ensure_ascii=False, indent=2)

    return {"success": True, "submissionId": record["submissionId"]}

@app.get("/api/exams/submissions")
async def get_all_submissions():
    """Returns all student submissions for teacher live monitoring."""
    sub_file = os.path.join(DATA_DIR, "student_submissions.json")
    if os.path.exists(sub_file):
        with open(sub_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# Mount static folders
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "JFT CBT Exam & Multi-Speaker TTS Server is running."}

if __name__ == "__main__":
    import uvicorn
    ips = get_lan_ips()
    port = 8000

    print("=" * 70)
    print("  JFT-BASIC CBT EXAM SYSTEM & MULTI-SPEAKER TTS SERVER")
    print("=" * 70)
    print(f"  Local Host Access:   http://localhost:{port}")
    if ips:
        print("  LAN Network Access (Other PCs, Tablets, Phones on same Wi-Fi):")
        for ip in ips:
            print(f"    --> http://{ip}:{port}")
    else:
        print("  LAN IP: Connecting via 0.0.0.0")
    print("=" * 70)
    print("  Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
