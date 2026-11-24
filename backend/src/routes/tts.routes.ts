import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Standard MPEG-2 Layer 3 Mono 24kHz / 96kbps silent frame (576 bytes)
const SILENT_FRAME = Buffer.concat([
  Buffer.from('fff394c47c0000034800000000', 'hex'),
  Buffer.alloc(563, 0x55)
]);

export function getSilenceBuffer(seconds: number): Buffer {
  if (seconds <= 0) return Buffer.alloc(0);
  const numFrames = Math.max(1, Math.round(seconds / 0.024));
  return Buffer.concat(Array(numFrames).fill(SILENT_FRAME));
}

export const CUSTOM_VOICES: Record<string, any> = {
  "ja-JP-KeitaNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Keita (圭太)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Male (Keita - 成人男性)",
    locale: "ja-JP",
  },
  "Keita": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Keita (圭太)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Male (Keita - 成人男性)",
    locale: "ja-JP",
  },
  "keita": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Keita (圭太)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Male (Keita - 成人男性)",
    locale: "ja-JP",
  },
  "ja-JP-AoiNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Aoi (葵)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Female (Aoi - 成人女性)",
    locale: "ja-JP",
  },
  "Aoi": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Aoi (葵)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Female (Aoi - 成人女性)",
    locale: "ja-JP",
  },
  "aoi": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Aoi (葵)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Female (Aoi - 成人女性)",
    locale: "ja-JP",
  },
  "ja-JP-NanamiNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 0,
    rate_offset: 0,
    name: "Aoi (Nanami)",
    gender: "Female",
    role_category: "female",
    role_label: "👩 Female (Aoi - 標準女性)",
    locale: "ja-JP",
  },
  "ja-JP-DaichiNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: -6,
    rate_offset: -2,
    name: "Keita (Deep)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Male (Keita - 低音男性)",
    locale: "ja-JP",
  },
  "ja-JP-RenChildNeural": {
    base_voice: "ja-JP-KeitaNeural",
    pitch_offset: 20,
    rate_offset: 6,
    name: "Ren (蓮・男の子)",
    gender: "Children Male",
    role_category: "male",
    role_label: "👦 Child Boy (男の子)",
    locale: "ja-JP",
  },
  "ja-JP-YunaChildNeural": {
    base_voice: "ja-JP-NanamiNeural",
    pitch_offset: 20,
    rate_offset: 6,
    name: "Yuna (由奈・女の子)",
    gender: "Children Female",
    role_category: "female",
    role_label: "👧 Child Girl (女の子)",
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

export function parseSpeakerRole(speakerName: string, existingSpeakersInScript: string[] = []) {
  const s = (speakerName || "").toLowerCase().trim();

  // 1. Child roles
  if (["男の子", "boy", "son", "息子", "子供 (男)", "子供（男）"].some(k => s.includes(k))) {
    return { role_category: "male", role_label: "👦 Child Boy (Ren - 男の子)", voice_id: "ja-JP-RenChildNeural" };
  }
  if (["女の子", "girl", "daughter", "娘", "子供 (女)", "子供（女）"].some(k => s.includes(k))) {
    return { role_category: "female", role_label: "👧 Child Girl (Yuna - 女の子)", voice_id: "ja-JP-YunaChildNeural" };
  }

  // 2. Compound gender qualifiers with role (e.g. 男の店員, 男の人, 女の店員, 女の人, 店員(男), 客(女))
  if (s.includes("男の") || s.includes("(男)") || s.includes("（男）") || s.includes("(male)") || s.includes("男性")) {
    return { role_category: "male", role_label: "👨 Male (Keita - 成人男性)", voice_id: "ja-JP-KeitaNeural" };
  }
  if (s.includes("女の") || s.includes("(女)") || s.includes("（女）") || s.includes("(female)") || s.includes("女性")) {
    return { role_category: "female", role_label: "👩 Female (Aoi - 成人女性)", voice_id: "ja-JP-AoiNeural" };
  }

  // 3. Explicit keywords
  const isFemale = [
    "女", "おんな", "female", "woman", "mama", "母", "お母さん", "姉", "妹", "妻", "彼女",
    "aoi", "nanami", "アナウンス", "受付", "案内", "看護師", "おばあさん", "祖母", "おば",
    "speaker 1", "speaker a", "person a", "話者1", "話者a"
  ].some(k => s.includes(k)) || s === "a" || s === "1";

  const isMale = [
    "男", "おとこ", "male", "man", "papa", "父", "お父さん", "兄", "弟", "夫", "彼氏",
    "keita", "daichi", "駅員", "車掌", "運転手", "おじいさん", "祖父", "おじ",
    "speaker 2", "speaker b", "person b", "話者2", "話者b"
  ].some(k => s.includes(k)) || s === "b" || s === "2";

  if (isFemale && !isMale) {
    return { role_category: "female", role_label: "👩 Female (Aoi - 成人女性)", voice_id: "ja-JP-AoiNeural" };
  }
  if (isMale && !isFemale) {
    return { role_category: "male", role_label: "👨 Male (Keita - 成人男性)", voice_id: "ja-JP-KeitaNeural" };
  }

  // 4. Conventional situational roles
  if (s.includes("店員")) {
    return { role_category: "female", role_label: "👩 Female (Aoi - 成人女性)", voice_id: "ja-JP-AoiNeural" };
  }
  if (s.includes("客")) {
    return { role_category: "male", role_label: "👨 Male (Keita - 成人男性)", voice_id: "ja-JP-KeitaNeural" };
  }

  // 5. Contextual dialogue pairing: if paired with an already known speaker in the same script
  if (Array.isArray(existingSpeakersInScript) && existingSpeakersInScript.length > 0) {
    const other = existingSpeakersInScript.find(sp => sp && sp !== speakerName);
    if (other) {
      const otherConf = parseSpeakerRole(other, []);
      if (otherConf.role_category === 'female') {
        return { role_category: "male", role_label: "👨 Male (Keita - 成人男性)", voice_id: "ja-JP-KeitaNeural" };
      } else if (otherConf.role_category === 'male') {
        return { role_category: "female", role_label: "👩 Female (Aoi - 成人女性)", voice_id: "ja-JP-AoiNeural" };
      }
    }
  }

  // Male speakers & narrator default -> Keita
  return { role_category: "male", role_label: "👨 Male (Keita - 成人男性)", voice_id: "ja-JP-KeitaNeural" };
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
  voiceId: string = 'ja-JP-KeitaNeural', 
  rate: number = 1.0, 
  pitch: number = 0
): Promise<Buffer> {
  const normVoice = (voiceId || '').trim();
  const isFem = /female|woman|aoi|nanami|葵|女/i.test(normVoice);
  const cfg = CUSTOM_VOICES[normVoice] || (isFem ? CUSTOM_VOICES['ja-JP-AoiNeural'] : CUSTOM_VOICES['ja-JP-KeitaNeural']);
  const baseVoice = cfg?.base_voice || (isFem ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural');
  const effPitch = pitch + (cfg?.pitch_offset || 0);
  const effRate = Math.round((rate - 1.0) * 100) + (cfg?.rate_offset || 0);
  const pitchStr = `${effPitch >= 0 ? '+' : ''}${effPitch}Hz`;
  const rateStr = `${effRate >= 0 ? '+' : ''}${effRate}%`;

  // Strategy 1: High-Fidelity Microsoft Edge Neural TTS in Node.js (24kHz 96kbps Crystal-Clear Studio MP3)
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(baseVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const audioStream = tts.toStream(text, { pitch: pitchStr, rate: rateStr }).audioStream;
    
    const buf = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => reject(new Error("MsEdgeTTS timeout")), 8000);
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err: any) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    if (buf && buf.length > 0) {
      return buf;
    }
  } catch (edgeErr: any) {
    console.warn("Primary Node Edge TTS note, checking python edge-tts:", edgeErr?.message);
  }

  // Strategy 2: Python edge-tts CLI execution (High fidelity neural Japanese voices)
  try {
    const tempMp3 = path.join(os.tmpdir(), `tts_${crypto.randomUUID()}.mp3`);

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
      if (buf && buf.length > 0) return buf;
    }
  } catch (pyErr) {
    // Python not installed or edge_tts error, fallback
  }

  // Strategy 3: Google Translate TTS audio fetch (Emergency fallback)
  try {
    const lang = baseVoice.startsWith('en') ? 'en' : 'ja';
    const chunks = text.length <= 160 ? [text] : text.match(/.{1,150}([。！？\n\s]|$)/g) || [text];
    const chunkBuffers: Buffer[] = [];

    for (const rawChunk of chunks) {
      const ch = rawChunk.trim();
      if (!ch) continue;
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ch)}&tl=${lang}&client=tw-ob`;
      const resp = await fetch(googleUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 0) chunkBuffers.push(buf);
      }
    }

    if (chunkBuffers.length > 0) {
      return Buffer.concat(chunkBuffers);
    }
  } catch (fbErr) {
    // Google TTS network error
  }

  throw new Error(`Speech synthesis engine unavailable for: "${text.substring(0, 30)}..."`);
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
    let outBuf: Buffer = Buffer.alloc(0);

    if (!alreadyExists) {
      outBuf = await synthesizeSpeechBuffer(cleanText, voice);
      audioUrl = saveAudioBuffer(filename, outBuf);
      duration = Math.max(1.0, Math.round((outBuf.length / 6000.0) * 10) / 10);
    } else {
      for (const dir of getAudioDirectories()) {
        const p = path.join(dir, filename);
        if (fs.existsSync(p)) {
          outBuf = fs.readFileSync(p);
          break;
        }
      }
    }

    const audioBase64 = outBuf && outBuf.length > 0 ? `data:audio/mp3;base64,${outBuf.toString('base64')}` : '';

    res.json({
      success: true,
      duration,
      voice_id: voice,
      audioUrl,
      audio_base64: audioBase64,
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
      const turns = Array.isArray(s.dialogues) ? s.dialogues : (Array.isArray(s.dialog) ? s.dialog : (Array.isArray(s.turns) ? s.turns : []));

      let rawTarget = s.targetAudio || s.target_audio || `${scriptId}.mp3`;
      let targetFilename = path.basename(rawTarget);
      if (!targetFilename.toLowerCase().endsWith('.mp3')) {
        targetFilename += '.mp3';
      }
      // Prevent collision with stock default single-letter audio files (A.mp3 .. I.mp3)
      if (/^[a-iA-I]\.mp3$/i.test(targetFilename)) {
        targetFilename = `dialogue_${targetFilename}`;
      }

      const turnChunks: Buffer[] = [];
      const processedTurns = [];
      let totalSpeechDuration = 0;

      // Extract unique speakers for contextual distinct voice resolution
      const uniqueSpeakers: string[] = Array.from(new Set(turns.map((t: any) => String(t.speaker || t.role || '').trim()).filter(Boolean)));
      const resolvedVoiceBySpeaker: Record<string, string> = {};

      if (uniqueSpeakers.length === 2) {
        const [spk1, spk2] = uniqueSpeakers;
        let v1 = speakerMap[spk1] ? (typeof speakerMap[spk1] === 'object' ? (speakerMap[spk1].voice_id || speakerMap[spk1].voice) : speakerMap[spk1]) : null;
        let v2 = speakerMap[spk2] ? (typeof speakerMap[spk2] === 'object' ? (speakerMap[spk2].voice_id || speakerMap[spk2].voice) : speakerMap[spk2]) : null;

        if (!v1) v1 = parseSpeakerRole(spk1, [spk2]).voice_id;
        if (!v2) {
          const conf2 = parseSpeakerRole(spk2, [spk1]);
          if (conf2.voice_id === v1) {
            v2 = conf2.role_category === 'female' ? 'ja-JP-NanamiNeural' : 'ja-JP-DaichiNeural';
          } else {
            v2 = conf2.voice_id;
          }
        }
        resolvedVoiceBySpeaker[spk1] = v1;
        resolvedVoiceBySpeaker[spk2] = v2;
      }

      for (let tIdx = 0; tIdx < turns.length; tIdx++) {
        const turn = turns[tIdx];
        const spk = String(turn.speaker || 'Narrator').trim();
        const text = String(turn.text || turn.dialogue || turn.content || '').trim();
        if (!text) continue;

        let voiceId = turn.voice || turn.voice_id;
        if (!voiceId && resolvedVoiceBySpeaker[spk]) {
          voiceId = resolvedVoiceBySpeaker[spk];
        }
        if (!voiceId && speakerMap[spk]) {
          const m = speakerMap[spk];
          voiceId = typeof m === 'object' ? (m.voice_id || m.voice) : m;
        }
        if (!voiceId) {
          voiceId = parseSpeakerRole(spk, uniqueSpeakers).voice_id;
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
        const turnBase64 = `data:audio/mp3;base64,${turnBuf.toString('base64')}`;

        processedTurns.push({
          ...turn,
          id: turnId,
          speaker: spk,
          text: text,
          voice: voiceId,
          duration: turnDuration,
          turn_audio_url: turnBase64,
          audioUrl: turnAudioUrl,
          audio_base64: turnBase64
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
      const masterBase64 = `data:audio/mp3;base64,${masterBuffer.toString('base64')}`;

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
          audio_base64: masterBase64,
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
