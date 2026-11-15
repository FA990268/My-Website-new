import { adminLoginSchema } from '../schemas/auth.schema.js';
import { query, withTransaction } from '../database/connection.js';
import { verifyPassword } from '../security/password.js';
import { signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken, hashToken, } from '../security/jwt.js';
import { recordFailedAttempt, resetFailedAttempts, } from '../security/rateLimiter.js';
import { env } from '../config/env.js';
export class AuthController {
    /**
     * Admin Login with Argon2id verification and rate limiting.
     */
    static async login(req, res) {
        try {
            const parsed = adminLoginSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: 'Validation Error',
                    details: parsed.error.format(),
                });
                return;
            }
            const { email, password } = parsed.data;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            // 1. Fetch admin by email
            const result = await query(`SELECT id, email, password_hash, full_name, role, is_active, failed_login_attempts, locked_until, totp_enabled
         FROM admins WHERE email = $1`, [email.toLowerCase().trim()]);
            if (result.rows.length === 0) {
                // Obfuscate user existence
                recordFailedAttempt(ip, email);
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid administrative credentials.',
                });
                return;
            }
            const admin = result.rows[0];
            // 2. Check account deactivation
            if (!admin.is_active) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'This account has been administratively disabled.',
                });
                return;
            }
            // 3. Check DB lockout
            if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
                const remainingSeconds = Math.ceil((new Date(admin.locked_until).getTime() - Date.now()) / 1000);
                res.status(429).json({
                    error: 'Account Locked',
                    message: `Account is temporarily locked due to repeated authentication failures. Try again in ${remainingSeconds} seconds.`,
                    retryAfterSeconds: remainingSeconds,
                });
                return;
            }
            // 4. Verify password with Argon2id
            const isValid = await verifyPassword(password, admin.password_hash);
            if (!isValid) {
                const { remainingAttempts, isLocked } = recordFailedAttempt(ip, email);
                // Update DB failed attempts
                if (isLocked) {
                    const lockTime = new Date(Date.now() + 15 * 60 * 1000);
                    await query('UPDATE admins SET failed_login_attempts = failed_login_attempts + 1, locked_until = $1 WHERE id = $2', [lockTime, admin.id]);
                }
                else {
                    await query('UPDATE admins SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1', [admin.id]);
                }
                // Audit log failed attempt
                await query(`INSERT INTO admin_audit_logs (admin_id, action, resource_type, ip_address, user_agent, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`, [
                    admin.id,
                    'ADMIN_LOGIN_FAILED',
                    'ADMIN_AUTH',
                    ip,
                    userAgent,
                    JSON.stringify({ reason: 'Invalid password', remainingAttempts }),
                ]);
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid administrative credentials.',
                    remainingAttempts,
                });
                return;
            }
            // 5. Password valid: Reset lockout counters
            resetFailedAttempts(ip, email);
            await query('UPDATE admins SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [admin.id]);
            // 6. Generate Scoped Access & Refresh Tokens
            const tokenPayload = {
                adminId: admin.id,
                email: admin.email,
                role: admin.role,
                fullName: admin.full_name,
                scope: 'ADMIN',
            };
            const accessToken = signAdminAccessToken(tokenPayload);
            const { rawToken: refreshToken, tokenHash, expiresAt } = signAdminRefreshToken({
                adminId: admin.id,
            });
            // 7. Store Refresh Token Hash in DB
            await query(`INSERT INTO refresh_tokens (admin_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`, [admin.id, tokenHash, expiresAt]);
            // 8. Log successful authentication
            await query(`INSERT INTO admin_audit_logs (admin_id, action, resource_type, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                admin.id,
                'ADMIN_LOGIN_SUCCESS',
                'ADMIN_AUTH',
                ip,
                userAgent,
                JSON.stringify({ timestamp: new Date().toISOString() }),
            ]);
            // 9. Set HttpOnly cookie for web client
            const isProduction = env.NODE_ENV === 'production';
            res.cookie('cbt_admin_access', accessToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 mins
            });
            res.cookie('cbt_admin_refresh', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                path: '/api/v1/admin/auth/refresh',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(200).json({
                message: 'Authentication successful',
                tokens: {
                    accessToken,
                    refreshToken,
                    tokenType: 'Bearer',
                    expiresInSeconds: 900,
                },
                admin: {
                    id: admin.id,
                    email: admin.email,
                    fullName: admin.full_name,
                    role: admin.role,
                    totpEnabled: admin.totp_enabled,
                },
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
    /**
     * Refresh Token Rotation: Revokes the previous refresh token and issues a new pair.
     */
    static async refresh(req, res) {
        try {
            const incomingRefreshToken = req.body?.refreshToken || req.cookies?.cbt_admin_refresh;
            if (!incomingRefreshToken) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Refresh token is required.',
                });
                return;
            }
            // Verify cryptographic signature
            const decoded = verifyAdminRefreshToken(incomingRefreshToken);
            const incomingHash = hashToken(incomingRefreshToken);
            // Check DB for token presence and revocation
            const tokenRecord = await query(`SELECT id, admin_id, revoked, expires_at FROM refresh_tokens WHERE token_hash = $1`, [incomingHash]);
            if (tokenRecord.rows.length === 0 || tokenRecord.rows[0].revoked) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Refresh token is invalid or has been revoked.',
                });
                return;
            }
            const row = tokenRecord.rows[0];
            if (new Date(row.expires_at) < new Date()) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Refresh token has expired. Please re-authenticate.',
                });
                return;
            }
            // Fetch admin details
            const adminResult = await query('SELECT id, email, full_name, role, is_active FROM admins WHERE id = $1', [row.admin_id]);
            if (adminResult.rows.length === 0 || !adminResult.rows[0].is_active) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Administrative account inactive or deleted.',
                });
                return;
            }
            const admin = adminResult.rows[0];
            // Rotate: Revoke the old refresh token and create new pair in transaction
            const newTokens = await withTransaction(async (client) => {
                // Revoke old token
                await client.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [
                    row.id,
                ]);
                // Issue new token pair
                const newAccessToken = signAdminAccessToken({
                    adminId: admin.id,
                    email: admin.email,
                    role: admin.role,
                    fullName: admin.full_name,
                    scope: 'ADMIN',
                });
                const { rawToken: newRefreshToken, tokenHash: newHash, expiresAt: newExpiry } = signAdminRefreshToken({ adminId: admin.id });
                await client.query(`INSERT INTO refresh_tokens (admin_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`, [admin.id, newHash, newExpiry]);
                return { newAccessToken, newRefreshToken };
            });
            res.status(200).json({
                message: 'Tokens rotated successfully',
                tokens: {
                    accessToken: newTokens.newAccessToken,
                    refreshToken: newTokens.newRefreshToken,
                    tokenType: 'Bearer',
                    expiresInSeconds: 900,
                },
            });
        }
        catch (error) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired refresh token.',
            });
        }
    }
    /**
     * Admin Logout: Revokes active refresh token and clears session cookies.
     */
    static async logout(req, res) {
        try {
            const incomingRefreshToken = req.body?.refreshToken || req.cookies?.cbt_admin_refresh;
            if (incomingRefreshToken) {
                const hash = hashToken(incomingRefreshToken);
                await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
                    hash,
                ]);
            }
            res.clearCookie('cbt_admin_access');
            res.clearCookie('cbt_admin_refresh', { path: '/api/v1/admin/auth/refresh' });
            res.status(200).json({ message: 'Administrative session successfully terminated.' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
    /**
     * Get Current Authenticated Admin Profile.
     */
    static async getMe(req, res) {
        try {
            if (!req.admin) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const result = await query(`SELECT id, email, full_name, role, is_active, totp_enabled, last_login_at, created_at
         FROM admins WHERE id = $1`, [req.admin.id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Admin not found' });
                return;
            }
            res.status(200).json({ admin: result.rows[0] });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
    /**
     * Audit Logs for Administrative Inspection.
     */
    static async getAuditLogs(req, res) {
        try {
            const limit = Math.min(Number(req.query.limit) || 50, 100);
            const offset = Number(req.query.offset) || 0;
            const result = await query(`SELECT l.id, l.action, l.resource_type, l.resource_id, l.ip_address, l.created_at, l.metadata,
                a.email as admin_email, a.full_name as admin_name
         FROM admin_audit_logs l
         LEFT JOIN admins a ON l.admin_id = a.id
         ORDER BY l.created_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]);
            const totalResult = await query('SELECT COUNT(*) FROM admin_audit_logs');
            res.status(200).json({
                total: parseInt(totalResult.rows[0].count, 10),
                limit,
                offset,
                logs: result.rows,
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
}
