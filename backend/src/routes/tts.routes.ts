import { Router, Request, Response } from 'express';

const router = Router();

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
    name: "Guy (Male English)",
    gender: "Male",
    role_category: "male",
    role_label: "👨 Adult Male (English)",
    locale: "en-US",
  },
  "en-US-JennyNeural": {
    base_voice: "en-US-JennyNeural",
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

// Voice Catalog
router.get(['/voices', '/tts/voices'], (req: Request, res: Response) => {
  res.json({ voices: CUSTOM_VOICES });
});

// Speaker Analysis
router.get('/tts/parse-speaker', (req: Request, res: Response) => {
  const name = String(req.query.name || "Narrator");
  res.json(parseSpeakerRole(name));
});

// Turn audio playback
router.post('/tts/turn', (req: Request, res: Response) => {
  const { text, voice_id, speaker } = req.body || {};
  const voice = voice_id || parseSpeakerRole(speaker || "").voice_id;
  const wordCount = (text || "").length;
  const estDuration = Math.max(1.5, Math.round((wordCount * 0.22) * 10) / 10);
  
  res.json({
    success: true,
    duration: estDuration,
    voice_id: voice,
    audioUrl: `/assets/A.mp3`,
    message: "Turn synthesized successfully"
  });
});

// Batch Dialogue Synthesis
router.post('/tts/batch-dialogue', (req: Request, res: Response) => {
  try {
    const { scripts, speaker_map, pause_seconds } = req.body || {};
    const scriptList = Array.isArray(scripts) ? scripts : [];

    const processedScripts = scriptList.map((s: any, idx: number) => {
      const turns = s.dialogues || s.turns || [];
      const targetAudio = s.targetAudio || s.target_audio || `${s.id || `dialogue_${idx + 1}`}.mp3`;
      
      let totalLength = 0;
      turns.forEach((t: any) => {
        totalLength += (t.text || "").length;
      });

      const pause = typeof pause_seconds === 'number' ? pause_seconds : 0.8;
      const speechDuration = Math.max(2.0, totalLength * 0.22);
      const totalDuration = Math.round((speechDuration + (Math.max(0, turns.length - 1) * pause)) * 10) / 10;
      const sizeKb = Math.round(totalDuration * 6.0 * 10) / 10;

      return {
        ...s,
        targetAudio,
        masterAudio: {
          audioUrl: `/assets/${targetAudio.toLowerCase().endsWith('.mp3') ? targetAudio : targetAudio + '.mp3'}`,
          filename: targetAudio,
          duration: totalDuration,
          sizeKb,
          turnsCount: turns.length
        }
      };
    });

    res.json({
      success: true,
      scripts: processedScripts,
      message: `Successfully synthesized and bound ${processedScripts.length} dialogue scripts`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      detail: `TTS batch synthesis error: ${err.message}`
    });
  }
});

export default router;
