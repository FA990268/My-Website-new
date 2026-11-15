import dotenv from 'dotenv';
import { z } from 'zod';
// Load .env
dotenv.config();
const envSchema = z.object({
    PORT: z.string().default('5000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // PostgreSQL Connection Config
    DATABASE_URL: z.string().optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().default('5432').transform(Number),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),
    DB_NAME: z.string().default('cbt_portal_db'),
    DB_SSL: z.string().default('false').transform((v) => v === 'true'),
    // Cryptography & Auth Tokens
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long for production security'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long for production security'),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    // Initial Admin Bootstrap
    INITIAL_ADMIN_EMAIL: z.string().email().default('admin@cbt-portal.internal'),
    INITIAL_ADMIN_PASSWORD: z.string().min(10).default('SuperAdmin#2026!CBT'),
    INITIAL_ADMIN_NAME: z.string().default('System Administrator'),
    // CORS
    ADMIN_CLIENT_URL: z.string().default('http://localhost:5173'),
    CANDIDATE_CLIENT_URL: z.string().default('http://localhost:5174'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ FATAL: Invalid environment configuration:');
    console.error(parsed.error.format());
    process.exit(1);
}
export const env = parsed.data;
