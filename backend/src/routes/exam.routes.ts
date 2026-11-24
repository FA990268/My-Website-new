import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
let inMemoryExamsCache: any[] | null = null;
const storageFilePath = path.resolve(__dirname, '../../data/saved_cbt_exams.json');
const tmpStoragePath = '/tmp/saved_cbt_exams.json';

function loadExamsFromFile(): any[] {
  if (inMemoryExamsCache !== null) {
    return inMemoryExamsCache;
  }
  // Try /tmp first for Vercel serverless persistence
  try {
    if (fs.existsSync(tmpStoragePath)) {
      const raw = fs.readFileSync(tmpStoragePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        inMemoryExamsCache = data;
        return data;
      }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(storageFilePath)) {
      const raw = fs.readFileSync(storageFilePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        inMemoryExamsCache = data;
        return data;
      }
      if (typeof data === 'object' && data !== null) {
        inMemoryExamsCache = Object.values(data);
        return inMemoryExamsCache;
      }
    }
  } catch (e) {
    console.warn('Error reading saved_cbt_exams.json:', e);
  }
  return [];
}

function saveExamsToFile(exams: any[]) {
  inMemoryExamsCache = exams;
  // Try writing to /tmp
  try {
    fs.writeFileSync(tmpStoragePath, JSON.stringify(exams, null, 2), 'utf-8');
  } catch (e) {}

  // Try writing to static storage if directory is writable
  try {
    const dir = path.dirname(storageFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storageFilePath, JSON.stringify(exams, null, 2), 'utf-8');
  } catch (e) {
    // EROFS on Vercel is expected and safely swallowed
  }
}

// GET all exams
router.get('/exams', async (req: Request, res: Response) => {
  try {
    // 1. Try PostgreSQL
    try {
      const pgRes = await pool.query('SELECT exam_id, title, exam_data FROM cbt_saved_exams ORDER BY updated_at DESC');
      if (pgRes.rows && pgRes.rows.length > 0) {
        const exams = pgRes.rows.map(r => {
          const d = r.exam_data || {};
          return { id: r.exam_id, title: r.title, ...d };
        });
        return res.json(exams);
      }
    } catch (pgErr) {
      // Fall through to file fallback
    }

    // 2. File fallback
    const fileExams = loadExamsFromFile();
    if (fileExams && fileExams.length > 0) {
      return res.json(fileExams);
    }

    // 3. Supabase Cloud table fallback
    try {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://xyxjoaluucliwwvprlvk.supabase.co';
      const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_gwIiiDdSZAlxSX6XeZmM-g_5WMLqERh';
      const supabaseTable = process.env.SUPABASE_TABLE || 'JFT Mock Test';
      const sbResp = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (sbResp.ok) {
        const rows: any = await sbResp.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped = rows.map((r: any, idx: number) => {
            let d: any = {};
            if (typeof r.data === 'object' && r.data !== null) d = r.data;
            else if (typeof r.data === 'string') {
              try { d = JSON.parse(r.data); } catch (e) {}
            }
            const qs = d.questions || d.examData || [];
            if (Array.isArray(qs)) {
              qs.forEach((q: any, qIdx: number) => {
                if (q.dialog && !q.dialogues) q.dialogues = q.dialog;
                if (q.dialogues && !q.dialog) q.dialog = q.dialogues;
                const dList = q.dialogues || q.dialog;
                if (Array.isArray(dList)) {
                  dList.forEach((t: any, tIdx: number) => {
                    if (t.content && !t.text) t.text = t.content;
                    if (t.text && !t.content) t.content = t.text;
                    if (t.role && !t.speaker) t.speaker = t.role;
                    if (t.speaker && !t.role) t.role = t.speaker;
                    if (!t.id) t.id = `turn_${q.id || qIdx}_${tIdx + 1}`;
                  });
                }
              });
            }
            return {
              id: String(r.id || d.id || `sb_${idx + 1}`),
              title: r.title || d.title || `Mock Test #${idx + 1}`,
              duration: d.duration || 60,
              passMark: d.passMark || 200,
              questions: qs,
              isActive: d.isActive !== false,
              ...d
            };
          });
          return res.json(mapped);
        }
      }
    } catch (sbErr) {
      // Continue to empty list
    }

    return res.json(fileExams);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch exams', detail: err.message });
  }
});

// GET single exam
router.get('/exams/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Try PG
    try {
      const pgRes = await pool.query('SELECT exam_id, title, exam_data FROM cbt_saved_exams WHERE exam_id = $1', [id]);
      if (pgRes.rows && pgRes.rows.length > 0) {
        const r = pgRes.rows[0];
        return res.json({ id: r.exam_id, title: r.title, ...(r.exam_data || {}) });
      }
    } catch (e) {}

    // File fallback
    const exams = loadExamsFromFile();
    const found = exams.find(x => x.id === id || x.exam_id === id);
    if (found) return res.json(found);

    res.status(404).json({ error: 'Exam not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load exam', detail: err.message });
  }
});

// POST save / update exam
router.post('/exams', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const examId = String(body.id || body.exam_id || `cbt_${Date.now()}`);
    const title = String(body.title || 'JFT-Basic CBT Exam');
    const examData = body.exam_data || body;

    if (!examData.id) examData.id = examId;
    if (!examData.title) examData.title = title;

    // 1. Try persisting to PostgreSQL
    let pgSaved = false;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cbt_saved_exams (
          id SERIAL PRIMARY KEY,
          exam_id VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          exam_data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query(`
        INSERT INTO cbt_saved_exams (exam_id, title, exam_data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (exam_id) DO UPDATE
        SET title = EXCLUDED.title,
            exam_data = EXCLUDED.exam_data,
            updated_at = CURRENT_TIMESTAMP;
      `, [examId, title, JSON.stringify(examData)]);
      pgSaved = true;
    } catch (pgErr: any) {
      console.warn('PostgreSQL exam insert skipped / fallback:', pgErr.message);
    }

    // 2. Update local JSON storage
    let fileExams = loadExamsFromFile();
    fileExams = fileExams.filter(x => x.id !== examId && x.exam_id !== examId);
    fileExams.push(examData);
    saveExamsToFile(fileExams);

    // 3. Sync to Supabase Cloud Table
    try {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://xyxjoaluucliwwvprlvk.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_gwIiiDdSZAlxSX6XeZmM-g_5WMLqERh';
      const supabaseTable = process.env.SUPABASE_TABLE || 'JFT Mock Test';
      
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?title=eq.${encodeURIComponent(title)}&select=id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const existing = checkRes.ok ? await checkRes.json() : [];
      if (Array.isArray(existing) && existing.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ title, data: examData })
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ title, data: examData })
        });
      }
    } catch (sbErr: any) {
      console.warn('Backend Supabase sync note:', sbErr.message);
    }

    res.json({
      success: true,
      id: examId,
      exam_id: examId,
      title,
      pgSaved,
      message: `Exam "${title}" saved successfully`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save exam', detail: err.message });
  }
});

// DELETE exam
router.delete('/exams/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    try {
      await pool.query('DELETE FROM cbt_saved_exams WHERE exam_id = $1', [id]);
    } catch (e) {}

    let fileExams = loadExamsFromFile();
    fileExams = fileExams.filter(x => x.id !== id && x.exam_id !== id && x.title !== id);
    saveExamsToFile(fileExams);

    res.json({ success: true, deleted_id: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete exam', detail: err.message });
  }
});

// Toggle exam active
router.post('/exams/:id/toggle-active', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    let fileExams = loadExamsFromFile();
    const item = fileExams.find(x => x.id === id || x.exam_id === id);
    let newState = true;
    let title = '';
    if (item) {
      item.isActive = item.isActive === false ? true : false;
      newState = item.isActive;
      title = item.title || '';
      saveExamsToFile(fileExams);
    }

    // 1. Sync to PostgreSQL
    try {
      await pool.query(
        `UPDATE cbt_saved_exams SET exam_data = jsonb_set(COALESCE(exam_data, '{}'), '{isActive}', $1::jsonb), updated_at = NOW() WHERE exam_id = $2`,
        [JSON.stringify(newState), id]
      );
    } catch (pgErr: any) {
      console.warn('PostgreSQL toggle sync skipped:', pgErr.message);
    }

    // 2. Sync to Supabase
    if (title) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://xyxjoaluucliwwvprlvk.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_gwIiiDdSZAlxSX6XeZmM-g_5WMLqERh';
        const supabaseTable = process.env.SUPABASE_TABLE || 'JFT Mock Test';
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?title=eq.${encodeURIComponent(title)}&select=id,data`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        if (checkRes.ok) {
          const rows: any = await checkRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const existingData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : (rows[0].data || {});
            existingData.isActive = newState;
            await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?id=eq.${rows[0].id}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ data: existingData })
            });
          }
        }
      } catch (sbErr: any) {
        console.warn('Supabase toggle sync note:', sbErr.message);
      }
    }

    res.json({ success: true, id, isActive: newState });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle exam', detail: err.message });
  }
});

export default router;
