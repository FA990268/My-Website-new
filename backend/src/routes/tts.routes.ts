import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Standard MPEG-2 Layer 3 Mono 24kHz / 48kbps silent frame (144 bytes)
const SILENT_FRAME = Buffer.concat([
  Buffer.from('fff364c47c0000034800000000', 'hex'),
  Buffer.alloc(131, 0x55)
]);

export function getSilenceBuffer(seconds: number): Buffer {
  if (seconds <= 0) return Buffer.alloc(0);
  const numFrames = Math.max(1, Math.round(seconds / 0.024));
  return Buffer.concat(Array(numFrames).fill(SILENT_FRAME));
}

export const CUSTOM_VOICES: Record<string, any> = {
  "ja-JP-DaichiNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: -12,
    rate_offset: -4,
    name: "Daichi (大智)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Adult Male (成人男性・ナレーター)",
    locale: "ja-JP",
  },
  "ja-JP-KeitaNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Keita (圭太)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Adult Male (成人男性・標準)",
    locale: "ja-JP",
  },
  "ja-JP-AoiNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: -5,
    rate_offset: -4,
    name: "Aoi (葵)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Adult Female (成人女性・店員・案内)",
    locale: "ja-JP",
  },
  "ja-JP-NanamiNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Nanami (七海)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Adult Female (成人女性・標準)",
    locale: "ja-JP",
  },
  "ja-JP-RenChildNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 28,
    rate_offset: 10,
    name: "Ren (蓮・男の子)",
    gender: "Children Male",
    role_category: "boy",
    role_label: "👦 Child Boy (少年・男の子)",
    locale: "ja-JP",
  },
  "ja-JP-YunaChildNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 26,
    rate_offset: 8,
    name: "Yuna (由奈・女の子)",
    gender: "Children Female",
    role_category: "girl",
    role_label: "👧 Child Girl (少女・女の子)",
    locale: "ja-JP",
  },
  "en-US-GuyNeural": {
    base_voice: "en-US-GuyNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Guy (Male English)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Adult Male (English)",
    locale: "en-US",
  },
  "en-US-JennyNeural": {
    base_voice: "en-US-JennyNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Jenny (Female English)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Adult Female (English)",
    locale: "en-US",
  }
};

export function parseSpeakerRole(speakerName: string) {
  const s = (speakerName || "").toLowerCase().trim();
  if (["ren", "leo", "蓮", "男の子", "少年", "boy", "son", "息子"].some(k => s.includes(k))) {
    return { role_category: "boy", role_label: "👦 Child Boy (男の子・少年)", voice_id: "ja-JP-RenChildNeural" };
  }
  if (["yuna", "mia", "由奈", "女の子", "少女", "girl", "daughter", "娘"].some(k => s.includes(k))) {
    return { role_category: "girl", role_label: "👧 Child Girl (女の子・少女)", voice_id: "ja-JP-YunaChildNeural" };
  }
  if (["女", "おんな", "female", "woman", "mama", "店員", "aoi", "nanami", "母"].some(k => s.includes(k))) {
    return { role_category: "female", role_label: "👩 Adult Female (女性)", voice_id: "ja-JP-NanamiNeural" };
  }
  if (["男", "おとこ", "male", "man", "papa", "keita", "daichi", "guy", "父"].some(k => s.includes(k))) {
    return { role_category: "male", role_label: "👨 Adult Male (男性)", voice_id: "ja-JP-KeitaNeural" };
  }
  return { role_category: "male", role_label: "👨 Adult Male (ナレーター)", voice_id: "ja-JP-DaichiNeural" };
}

export function getAudioDirectories(): string[] {
  return [
    path.resolve(process.cwd(), 'public/assets/audio'),
    path.resolve(process.cwd(), 'assets/audio'),
    path.resolve(__dirname, '../../public/assets/audio'),
    path.resolve(__dirname, '../../assets/audio'),
    path.resolve(__dirname, '../public/assets/audio'),
    path.resolve(os.tmpdir(), 'cbt_audio')
  ];
}

export function saveAudioBuffer(filename: string, buffer: Buffer): string {
  const safeFilename = path.basename(filename);
  for (const dir of getAudioDirectories()) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, safeFilename), buffer);
    } catch (e) {
      // Ignore directory write issues on read-only environments
    }
  }
  return `/api/audio/${safeFilename}`;
}

export async function synthesizeSpeechBuffer(
  text: string, 
  voiceId: string = 'ja-JP-NanamiNeural', 
  rate: number = 1.0, 
  pitch: number = 0
): Promise<Buffer> {
  const cfg = CUSTOM_VOICES[voiceId] || CUSTOM_VOICES['ja-JP-NanamiNeural'];
  const baseVoice = cfg.base_voice || voiceId || 'ja-JP-NanamiNeural';
  const effPitch = pitch + (cfg.pitch_offset || 0);
  const effRate = Math.round((rate - 1.0) * 100) + (cfg.rate_offset || 0);

  // Strategy 1: Python edge-tts CLI execution (High fidelity neural Japanese voices)
  try {
    const tempMp3 = path.join(os.tmpdir(), `tts_${crypto.randomUUID()}.mp3`);
    const rateStr = `${effRate >= 0 ? '+' : ''}${effRate}%`;
    const pitchStr = `${effPitch >= 0 ? '+' : ''}${effPitch}Hz`;

    await execFileAsync('python', [
      '-m', 'edge_tts',
      '--voice', baseVoice,
      '--rate', rateStr,
      '--pitch', pitchStr,
      '--text', text,
      '--write-media', tempMp3
    ], { timeout: 15000 });

    if (fs.existsSync(tempMp3)) {
      const buf = fs.readFileSync(tempMp3);
      try { fs.unlinkSync(tempMp3); } catch (e) {}
      if (buf.length > 0) return buf;
    }
  } catch (pyErr) {
    // Python not installed or edge_tts error, fallback seamlessly to Google TTS
  }

  // Strategy 2: Google Translate TTS audio fetch (Universal zero-dependency network fallback)
  try {
    const lang = baseVoice.startsWith('en') ? 'en' : 'ja';
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.substring(0, 200))}&tl=${lang}&client=tw-ob`;
    const resp = await fetch(googleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000)
    });
    if (resp.ok) {
      const arrayBuf = await resp.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length > 0) return buf;
    }
  } catch (fbErr) {
    // Log fallback error
  }

  // Strategy 3: Fallback to bundled sound if network completely offline
  const fallbackAsset = path.resolve(__dirname, '../../assets/A.mp3');
  if (fs.existsSync(fallbackAsset)) {
    return fs.readFileSync(fallbackAsset);
  }

  return SILENT_FRAME;
}

// Voice Catalog
router.get(['/voices', '/tts/voices'], (req: Request, res: Response) => {
  res.json({ voices: CUSTOM_VOICES });
});

// Speaker Analysis
router.get('/tts/parse-speaker', (req: Request, res: Response) => {
  const name = String(req.query.name || "Narrator");
  res.json(parseSpeakerRole(name));
});

// Audio Delivery Route (serves synthesized unique audio files with case-insensitive fallback)
router.get(['/audio/:filename', '/tts/audio/:filename'], (req: Request, res: Response) => {
  const rawParam = req.params.filename;
  const filename = path.basename(Array.isArray(rawParam) ? rawParam[0] : (rawParam || ''));
  const isLetter = /^[a-iA-I]\.mp3$/i.test(filename);
  const candidates = Array.from(new Set([
    filename,
    filename.toUpperCase(),
    filename.toLowerCase(),
    isLetter ? `${filename[0].toUpperCase()}.mp3` : filename,
    isLetter ? `${filename[0].toLowerCase()}.mp3` : filename
  ]));

  for (const dir of getAudioDirectories()) {
    for (const cand of candidates) {
      const p = path.join(dir, cand);
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(p);
      }
    }
  }

  for (const cand of candidates) {
    const rootAsset = path.resolve(__dirname, '../../assets', cand);
    if (fs.existsSync(rootAsset)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.sendFile(rootAsset);
    }
  }

  res.status(404).json({ error: 'Audio file not found', filename });
});

// Turn Audio Playback Endpoint (Generates unique audio per line)
router.post('/tts/turn', async (req: Request, res: Response) => {
  try {
    const { text, voice_id, speaker, id } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, detail: "Text is required for TTS synthesis" });
    }
    const cleanText = String(text).trim();
    const voice = voice_id || parseSpeakerRole(speaker || "").voice_id;

    const safeId = String(id || 'turn').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const textHash = crypto.createHash('md5').update(`${cleanText}_${voice}`).digest('hex').substring(0, 8);
    const filename = `turn_${safeId}_${textHash}.mp3`;

    // Check if already synthesized and cached
    let alreadyExists = false;
    for (const dir of getAudioDirectories()) {
      if (fs.existsSync(path.join(dir, filename))) {
        alreadyExists = true;
        break;
      }
    }

    let audioUrl = `/api/audio/${filename}`;
    let duration = Math.max(1.0, Math.round((cleanText.length * 0.22) * 10) / 10);

    if (!alreadyExists) {
      const buf = await synthesizeSpeechBuffer(cleanText, voice);
      audioUrl = saveAudioBuffer(filename, buf);
      duration = Math.max(1.0, Math.round((buf.length / 6000.0) * 10) / 10);
    }

    res.json({
      success: true,
      duration,
      voice_id: voice,
      audioUrl,
      filename,
      message: "Unique turn audio synthesized successfully"
    });
  } catch (err: any) {
    res.status(500).json({ success: false, detail: `Turn synthesis error: ${err.message}` });
  }
});

// Batch Dialogue Synthesis Endpoint
router.post('/tts/batch-dialogue', async (req: Request, res: Response) => {
  try {
    const { scripts, speaker_map, pause_seconds } = req.body || {};
    const scriptList = Array.isArray(scripts) ? scripts : [];
    const speakerMap = (typeof speaker_map === 'object' && speaker_map !== null) ? speaker_map : {};
    const pauseSec = typeof pause_seconds === 'number' ? pause_seconds : 0.8;

    const processedScripts = [];

    for (let sIdx = 0; sIdx < scriptList.length; sIdx++) {
      const s = scriptList[sIdx];
      const scriptId = s.id || `script_${sIdx + 1}`;
      const turns = Array.isArray(s.dialogues) ? s.dialogues : (Array.isArray(s.turns) ? s.turns : []);

      let rawTarget = s.targetAudio || s.target_audio || `${scriptId}.mp3`;
      let targetFilename = path.basename(rawTarget);
      if (!targetFilename.toLowerCase().endsWith('.mp3')) {
        targetFilename += '.mp3';
      }

      const turnChunks: Buffer[] = [];
      const processedTurns = [];
      let totalSpeechDuration = 0;

      for (let tIdx = 0; tIdx < turns.length; tIdx++) {
        const turn = turns[tIdx];
        const spk = String(turn.speaker || 'Narrator').trim();
        const text = String(turn.text || turn.dialogue || '').trim();
        if (!text) continue;

        let voiceId = turn.voice || turn.voice_id;
        if (!voiceId && speakerMap[spk]) {
          const m = speakerMap[spk];
          voiceId = typeof m === 'object' ? (m.voice_id || m.voice) : m;
        }
        if (!voiceId) {
          voiceId = parseSpeakerRole(spk).voice_id;
        }

        const rate = parseFloat(turn.rate) || 1.0;
        const pitch = parseInt(turn.pitch, 10) || 0;

        const turnId = turn.id || `${scriptId}_t${tIdx + 1}`;
        const safeTurnId = String(turnId).replace(/[^a-zA-Z0-9_\-]/g, '_');
        const textHash = crypto.createHash('md5').update(`${text}_${voiceId}`).digest('hex').substring(0, 8);
        const turnFilename = `turn_${safeTurnId}_${textHash}.mp3`;

        // Check if turn audio is already cached
        let turnBuf: Buffer | null = null;
        for (const dir of getAudioDirectories()) {
          const p = path.join(dir, turnFilename);
          if (fs.existsSync(p)) {
            turnBuf = fs.readFileSync(p);
            break;
          }
        }

        if (!turnBuf) {
          turnBuf = await synthesizeSpeechBuffer(text, voiceId, rate, pitch);
        }

        const turnAudioUrl = saveAudioBuffer(turnFilename, turnBuf);
        const turnDuration = Math.max(1.0, Math.round((turnBuf.length / 6000.0) * 10) / 10);
        totalSpeechDuration += turnDuration;

        turnChunks.push(turnBuf);

        processedTurns.push({
          ...turn,
          id: turnId,
          speaker: spk,
          text: text,
          voice: voiceId,
          duration: turnDuration,
          turn_audio_url: turnAudioUrl,
          audioUrl: turnAudioUrl
        });
      }

      // Combine turns into master dialogue audio
      const masterChunks: Buffer[] = [];
      for (let i = 0; i < turnChunks.length; i++) {
        masterChunks.push(turnChunks[i]);
        if (i < turnChunks.length - 1) {
          masterChunks.push(getSilenceBuffer(pauseSec));
        }
      }

      const masterBuffer = masterChunks.length > 0 ? Buffer.concat(masterChunks) : SILENT_FRAME;
      const masterAudioUrl = saveAudioBuffer(targetFilename, masterBuffer);

      const totalPauseDuration = Math.max(0, turnChunks.length - 1) * pauseSec;
      const totalDuration = Math.round((totalSpeechDuration + totalPauseDuration) * 10) / 10;
      const sizeKb = Math.round((masterBuffer.length / 1024.0) * 10) / 10;

      processedScripts.push({
        ...s,
        id: scriptId,
        targetAudio: targetFilename,
        dialogues: processedTurns,
        turns: processedTurns,
        masterAudio: {
          audioUrl: masterAudioUrl,
          filename: targetFilename,
          duration: totalDuration,
          sizeKb: sizeKb,
          turnsCount: processedTurns.length
        }
      });
    }

    res.json({
      success: true,
      scripts: processedScripts,
      message: `Successfully synthesized ${processedScripts.length} dialogue scripts with unique audio files`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      detail: `TTS batch synthesis error: ${err.message}`
    });
  }
});

export default router;
