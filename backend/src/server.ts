import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { testConnection } from './database/connection.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Security & Cross-Origin Configuration
const allowedOrigins = [env.ADMIN_CLIENT_URL, env.CANDIDATE_CLIENT_URL];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
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

/* -------------------------------------------------------------------------
 * Health & Operational Status Probe
 * ------------------------------------------------------------------------- */
app.get('/api/health', async (req: Request, res: Response) => {
  const dbStatus = await testConnection();
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

// 404 Fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    message: 'The requested resource does not exist on this server.',
  });
});

/* -------------------------------------------------------------------------
 * Server Launch
 * ------------------------------------------------------------------------- */
const server = app.listen(env.PORT, async () => {
  console.log(`================================================================`);
  console.log(` 🏛️  CBT High-Precision Portal - Admin Core & Engine`);
  console.log(` 🌐 Server active at: http://localhost:${env.PORT}`);
  console.log(` 🔒 Environment:     ${env.NODE_ENV}`);
  console.log(` 🛡️  Argon2id Memory: 64 MiB | OWASP Grade Authentication`);
  console.log(`================================================================`);

  // Verify PostgreSQL Connectivity
  const dbHealth = await testConnection();
  if (dbHealth.connected) {
    console.log(` ✅ PostgreSQL DB:    ${dbHealth.message}`);
  } else {
    console.warn(` ⚠️ PostgreSQL DB:    ${dbHealth.message}`);
    console.warn(` ℹ️ Note: Start PostgreSQL and run 'npm run db:migrate' to apply schemas.`);
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

export default app;
