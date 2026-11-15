import { pool, query, withTransaction } from './connection.js';
import { hashPassword } from '../security/password.js';
import { env } from '../config/env.js';

export async function seedInitialAdmin(): Promise<void> {
  console.log('🌱 Checking Initial Admin Provisioning...');

  try {
    const existing = await query('SELECT id, email, full_name, role FROM admins WHERE email = $1', [
      env.INITIAL_ADMIN_EMAIL,
    ]);

    if (existing.rows.length > 0) {
      console.log(`ℹ️ Root admin already provisioned: ${existing.rows[0].email} (Role: ${existing.rows[0].role})`);
      return;
    }

    console.log(`🔐 Hashing root administrator password with Argon2id (OWASP 64MB memory cost)...`);
    const passwordHash = await hashPassword(env.INITIAL_ADMIN_PASSWORD);

    await withTransaction(async (client) => {
      const adminInsert = await client.query(
        `INSERT INTO admins (
          email,
          password_hash,
          full_name,
          role,
          is_active
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, full_name, role, created_at`,
        [
          env.INITIAL_ADMIN_EMAIL,
          passwordHash,
          env.INITIAL_ADMIN_NAME,
          'SUPER_ADMIN',
          true,
        ]
      );

      const admin = adminInsert.rows[0];

      // Audit log the creation
      await client.query(
        `INSERT INTO admin_audit_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          admin.id,
          'SYSTEM_BOOTSTRAP_ADMIN_CREATED',
          'ADMIN_USER',
          admin.id,
          JSON.stringify({
            email: admin.email,
            role: admin.role,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      console.log(`✅ [PROVISIONED] Root Admin successfully initialized:`);
      console.log(`   - ID:        ${admin.id}`);
      console.log(`   - Email:     ${admin.email}`);
      console.log(`   - Role:      ${admin.role}`);
      console.log(`   - Created:   ${admin.created_at}`);
    });
  } catch (error: any) {
    console.error('❌ Failed to seed initial admin:', error.message);
    throw error;
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedInitialAdmin()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}
