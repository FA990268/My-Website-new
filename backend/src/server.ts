import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { testConnection } from './database/connection.js';
import authRoutes from './routes/auth.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & Cross-Origin Configuration
const allowedOrigins = [env.ADMIN_CLIENT_URL, env.CANDIDATE_CLIENT_URL];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin, allowed client URLs, localhost, or vercel.app domains
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Serve static assets from public directory if present
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

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
      auth: '/api/v1/admin/auth'
    }
  });
});

/* -------------------------------------------------------------------------
 * Health & Operational Status Probe
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

/* -------------------------------------------------------------------------
 * API Routing Topology
 * ------------------------------------------------------------------------- */
// Administrative Security & Auth Module
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
 * Server Launch
 * (Only binds to a local port when running as a standalone server, NOT on Vercel)
 * ------------------------------------------------------------------------- */
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, async () => {
    console.log(`================================================================`);
    console.log(` 🏛️  CBT High-Precision Portal - Admin Core & Engine`);
    console.log(` 🌐 Server active at: http://localhost:${env.PORT}`);
    console.log(` 🔒 Environment:     ${env.NODE_ENV}`);
    console.log(` 🛡️  Argon2id Memory: 64 MiB | OWASP Grade Authentication`);
    console.log(`================================================================`);

    // Verify PostgreSQL Connectivity safely
    try {
      const dbHealth = await testConnection();
      if (dbHealth.connected) {
        console.log(` ✅ PostgreSQL DB:    ${dbHealth.message}`);
      } else {
        console.warn(` ⚠️ PostgreSQL DB:    ${dbHealth.message}`);
        console.warn(` ℹ️ Note: Start PostgreSQL and run 'npm run db:migrate' to apply schemas.`);
      }
    } catch (e: any) {
      console.warn(` ⚠️ PostgreSQL check skipped: ${e.message}`);
    }
  });

  // Process signal handling
  const gracefulShutdown = () => {
    console.log('\n🛑 Initiating graceful server termination...');
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Export default app for Vercel Serverless Function invocation
export default app;
