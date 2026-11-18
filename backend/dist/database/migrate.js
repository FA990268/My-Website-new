import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query, withTransaction } from './connection.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function runMigrations() {
    console.log('🔄 Initializing PostgreSQL Migration Runner...');
    try {
        // 1. Ensure migrations tracking table exists
        await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        // 2. Discover migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.warn(`⚠️ Migrations directory not found at ${migrationsDir}`);
            return;
        }
        const files = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();
        const appliedResult = await query('SELECT filename FROM schema_migrations');
        const appliedSet = new Set(appliedResult.rows.map((r) => r.filename));
        let executedCount = 0;
        for (const file of files) {
            if (appliedSet.has(file)) {
                console.log(`⏩ [SKIP] Migration already applied: ${file}`);
                continue;
            }
            console.log(`🚀 [APPLYING] Migration: ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');
            await withTransaction(async (client) => {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            });
            console.log(`✅ [SUCCESS] Applied: ${file}`);
            executedCount++;
        }
        console.log(`\n🎉 Migration completed. Total new migrations applied: ${executedCount}`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail)
            console.error('Detail:', error.detail);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runMigrations();
}
export { runMigrations };
