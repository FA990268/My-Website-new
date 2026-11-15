import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
const AUTH_ISSUER = 'cbt-auth-authority';
const ADMIN_AUDIENCE = 'cbt-admin-portal';
const CANDIDATE_AUDIENCE = 'cbt-candidate-portal';
/**
 * Signs an Admin Access Token with strict audience and issuer constraints.
 */
export function signAdminAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        algorithm: 'HS256',
        issuer: AUTH_ISSUER,
        audience: ADMIN_AUDIENCE,
        expiresIn: env.JWT_ACCESS_EXPIRATION,
    });
}
/**
 * Signs an Admin Refresh Token.
 */
export function signAdminRefreshToken(payload) {
    const rawToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        algorithm: 'HS256',
        issuer: AUTH_ISSUER,
        audience: ADMIN_AUDIENCE,
        expiresIn: env.JWT_REFRESH_EXPIRATION,
    });
    // Calculate SHA-256 hash for database storage (tokens never stored in plain text)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // Expiration calculation (default 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { rawToken, tokenHash, expiresAt };
}
/**
 * Verifies and decodes an Admin Access Token.
 * Rejects tokens without the specific admin audience or issuer.
 */
export function verifyAdminAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: AUTH_ISSUER,
        audience: ADMIN_AUDIENCE,
    });
    if (decoded.scope !== 'ADMIN') {
        throw new Error('Access denied: Token is not scoped for administrative operations.');
    }
    return decoded;
}
/**
 * Verifies and decodes an Admin Refresh Token.
 */
export function verifyAdminRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: AUTH_ISSUER,
        audience: ADMIN_AUDIENCE,
    });
}
/**
 * Computes the SHA-256 hash of a raw token string for DB lookup.
 */
export function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}
