import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const submissionsFilePath = path.resolve(__dirname, '../../data/student_submissions.json');

function loadSubmissionsFromFile(): any[] {
  try {
    if (fs.existsSync(submissionsFilePath)) {
      const raw = fs.readFileSync(submissionsFilePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      if (typeof data === 'object' && data !== null) return Object.values(data);
    }
  } catch (e) {
    console.warn('Error reading student_submissions.json:', e);
  }
  return [];
}

function saveSubmissionsToFile(subs: any[]) {
  try {
    const dir = path.dirname(submissionsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(submissionsFilePath, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving student_submissions.json:', e);
  }
}

// POST submit exam
router.post('/submit-exam', async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const candidateId = String(payload.candidate_id || payload.regNo || `JFT-${Date.now()}`).trim();
    const candidateName = String(payload.full_name || payload.studentName || 'CANDIDATE').trim();
    const questionsData = payload.questions || payload.answers || [];

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalScore = 0;
    const evaluatedAnswers: any[] = [];

    questionsData.forEach((q: any, idx: number) => {
      const qNum = q.question_number || idx + 1;
      const secName = q.section_name || q.section || "Section 1";
      const qText = q.question_text || q.question || `Question #${qNum}`;
      const rawSel = q.selected_option !== undefined ? q.selected_option : q.selected;
      const rawCorr = q.correct_option !== undefined ? q.correct_option : q.correct;
      const mark = Number(q.mark || q.marks || 6);

      const selStr = String(rawSel !== undefined && rawSel !== null ? rawSel : "").trim();
      const corrStr = String(rawCorr !== undefined && rawCorr !== null ? rawCorr : "").trim();
      const letterMap: Record<string, string> = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'a': '1', 'b': '2', 'c': '3', 'd': '4' };
      const normSel = letterMap[selStr] || selStr;
      const normCorr = letterMap[corrStr] || corrStr;

      let isCorrect = selStr !== "" && corrStr !== "" && (normSel === normCorr || selStr === corrStr);
      if (!isCorrect && Array.isArray(q.options) && Number(rawSel) >= 1 && Number(rawSel) <= q.options.length) {
        const optText = String(q.options[Number(rawSel) - 1]).trim();
        if (optText === corrStr) isCorrect = true;
      }
      if (!isCorrect && corrStr === "0" && normSel === "1") isCorrect = true;

      if (isCorrect) {
        totalCorrect++;
        totalScore += mark;
      } else {
        totalWrong++;
      }

      evaluatedAnswers.push({
        question_number: qNum,
        section_name: secName,
        question_text: qText,
        selected_option: selStr,
        correct_option: corrStr,
        is_correct: isCorrect,
        marks_awarded: isCorrect ? mark : 0
      });
    });

    if (payload.totalScore !== undefined && Number(payload.totalScore) >= 0) {
      totalScore = Number(payload.totalScore);
    }

    const submissionId = Date.now();
    const submittedAt = new Date().toISOString();

    const record = {
      id: submissionId,
      submission_id: submissionId,
      candidate_id: candidateId,
      candidate_name: candidateName,
      total_questions: questionsData.length || 60,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_score: totalScore,
      submitted_at: submittedAt,
      answers: evaluatedAnswers,
      raw_submission_json: payload
    };

    // 1. Try PostgreSQL insertion
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exam_submissions (
          id SERIAL PRIMARY KEY,
          candidate_id VARCHAR(100) NOT NULL,
          candidate_name VARCHAR(255) NOT NULL,
          total_questions INT DEFAULT 60,
          total_correct INT DEFAULT 0,
          total_wrong INT DEFAULT 0,
          total_score INT DEFAULT 0,
          raw_submission_json JSONB,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query(`
        INSERT INTO exam_submissions (candidate_id, candidate_name, total_questions, total_correct, total_wrong, total_score, raw_submission_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [candidateId, candidateName, record.total_questions, totalCorrect, totalWrong, totalScore, JSON.stringify(payload)]);
    } catch (pgErr: any) {
      console.warn('PostgreSQL submission insert fallback:', pgErr.message);
    }

    // 2. Save to JSON file
    const subs = loadSubmissionsFromFile();
    subs.unshift(record);
    saveSubmissionsToFile(subs.slice(0, 100));

    res.json({
      success: true,
      submission_id: submissionId,
      total_score: totalScore,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      candidate_id: candidateId,
      candidate_name: candidateName,
      message: 'Exam submitted successfully'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit exam', detail: err.message });
  }
});

// GET all submissions
router.get('/submissions', async (req: Request, res: Response) => {
  try {
    try {
      const pgRes = await pool.query(`
        SELECT id, candidate_id, candidate_name, total_questions, total_correct, total_wrong, total_score, 
               TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
        FROM exam_submissions
        ORDER BY id DESC LIMIT 50;
      `);
      if (pgRes.rows && pgRes.rows.length > 0) {
        return res.json(pgRes.rows);
      }
    } catch (e) {}

    const subs = loadSubmissionsFromFile();
    res.json(subs.map(s => ({
      id: s.id || s.submission_id,
      candidate_id: s.candidate_id,
      candidate_name: s.candidate_name,
      total_questions: s.total_questions,
      total_correct: s.total_correct,
      total_wrong: s.total_wrong,
      total_score: s.total_score,
      submitted_at: s.submitted_at
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch submissions', detail: err.message });
  }
});

// GET single submission
router.get('/submissions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const subs = loadSubmissionsFromFile();
    const found = subs.find(x => String(x.id) === String(id) || String(x.submission_id) === String(id));
    if (found) return res.json(found);

    res.status(404).json({ error: 'Submission not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch submission details', detail: err.message });
  }
});

// GET latest submission
router.get('/submissions/latest', async (req: Request, res: Response) => {
  try {
    const subs = loadSubmissionsFromFile();
    if (subs.length > 0) {
      return res.json(subs[0]);
    }
    res.status(404).json({ error: 'No submissions found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch latest submission', detail: err.message });
  }
});

export default router;
