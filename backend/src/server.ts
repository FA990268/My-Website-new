import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { testConnection } from './database/connection.js';
import authRoutes from './routes/auth.routes.js';
import ttsRoutes from './routes/tts.routes.js';
import examRoutes from './routes/exam.routes.js';
import submissionRoutes from './routes/submission.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & Cross-Origin Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins, client URLs, localhost, or vercel.app domains
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Static Files & Asset Delivery
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
app.use('/assets', express.static(path.resolve(__dirname, '../public/assets')));
app.use('/assets', express.static(path.resolve(__dirname, '../../assets')));
app.use('/audio', express.static(path.resolve(__dirname, '../public/assets/audio')));
app.use('/audio', express.static(path.resolve(__dirname, '../../assets/audio')));
app.use('/data', express.static(path.resolve(__dirname, '../../data')));
app.use('/data', express.static(path.resolve(__dirname, '../data')));

// Dedicated Audio Serving Handlers (supports /audio, /assets/audio, /api/audio, /assets)
app.get(['/audio/:filename', '/assets/audio/:filename', '/api/audio/:filename', '/assets/:filename'], (req: Request, res: Response, next) => {
  const rawParam = req.params.filename;
  const filename = path.basename(Array.isArray(rawParam) ? rawParam[0] : (rawParam || ''));
  if (!filename.toLowerCase().endsWith('.mp3')) {
    return next();
  }

  const isLetter = /^[a-iA-I]\.mp3$/i.test(filename);
  const candidates = Array.from(new Set([
    filename,
    filename.toUpperCase(),
    filename.toLowerCase(),
    isLetter ? `${filename[0].toUpperCase()}.mp3` : filename,
    isLetter ? `${filename[0].toLowerCase()}.mp3` : filename
  ]));

  const searchDirs = [
    path.resolve(process.cwd(), 'public/assets/audio'),
    path.resolve(process.cwd(), 'assets/audio'),
    path.resolve(__dirname, '../../public/assets/audio'),
    path.resolve(__dirname, '../../assets/audio'),
    path.resolve(__dirname, '../public/assets/audio'),
    path.resolve(__dirname, '../public/assets'),
    path.resolve(__dirname, '../../assets'),
    path.resolve(process.cwd(), 'assets'),
    path.resolve(process.cwd(), 'public/assets'),
    path.resolve(os.tmpdir(), 'cbt_audio')
  ];

  for (const dir of searchDirs) {
    for (const cand of candidates) {
      const fullPath = path.join(dir, cand);
      if (fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(fullPath);
      }
    }
  }
  next();
});

/* -------------------------------------------------------------------------
 * Root & Frontend Delivery Route
 * ------------------------------------------------------------------------- */
app.get('/', (req: Request, res: Response) => {
  const candidateIndexPaths = [
    path.resolve(__dirname, '../public/index.html'),
    path.resolve(__dirname, '../../index.html'),
    path.resolve(process.cwd(), 'index.html'),
    path.resolve(process.cwd(), 'public/index.html'),
    path.resolve(__dirname, '../index.html'),
  ];
  for (const p of candidateIndexPaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  res.json({
    status: 'healthy',
    service: 'CBT Admin Core & Delivery Engine API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      exams: '/api/exams',
      tts: '/api/tts/batch-dialogue',
      submissions: '/api/submissions'
    }
  });
});

/* -------------------------------------------------------------------------
 * Health & Network Status
 * ------------------------------------------------------------------------- */
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus: { connected: boolean; message: string };
  try {
    dbStatus = await testConnection();
  } catch (err: any) {
    dbStatus = { connected: false, message: `Database probe error: ${err.message}` };
  }
  res.json({
    status: dbStatus.connected ? 'healthy' : 'degraded',
    service: 'CBT Admin Core & Delivery Engine API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: dbStatus,
  });
});

app.get('/api/network-info', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    lan_ip: 'cloud',
    host: 'Vercel Edge / Serverless',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

/* -------------------------------------------------------------------------
 * API Routing Topology (Full CBT, Exams, Submissions, TTS, & Auth)
 * ------------------------------------------------------------------------- */
app.use('/api', ttsRoutes);
app.use('/api', examRoutes);
app.use('/api', submissionRoutes);
app.use('/api/v1/admin/auth', authRoutes);

// 404 Fallback for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: 'The requested resource does not exist on this server.',
  });
});

/* -------------------------------------------------------------------------
 * Standalone Server Launch
 * ------------------------------------------------------------------------- */
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, async () => {
    console.log(`================================================================`);
    console.log(` 🏛️  CBT High-Precision Portal - Admin Core & Engine`);
    console.log(` 🌐 Server active at: http://localhost:${env.PORT}`);
    console.log(` 🔒 Environment:     ${env.NODE_ENV}`);
    console.log(`================================================================`);

    try {
      const dbHealth = await testConnection();
      if (dbHealth.connected) {
        console.log(` ✅ PostgreSQL DB:    ${dbHealth.message}`);
      } else {
        console.warn(` ⚠️ PostgreSQL DB:    ${dbHealth.message}`);
      }
    } catch (e: any) {
      console.warn(` ⚠️ PostgreSQL check skipped: ${e.message}`);
    }
  });

  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
}

export default app;
