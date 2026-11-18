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
    if (item) {
      item.isActive = item.isActive === false ? true : false;
      newState = item.isActive;
      saveExamsToFile(fileExams);
    }
    res.json({ success: true, id, isActive: newState });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle exam', detail: err.message });
  }
});

export default router;
