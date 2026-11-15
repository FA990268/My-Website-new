import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'EXAM_MANAGER' | 'AUDITOR';
  fullName: string;
  scope: 'ADMIN';
}

export interface CandidateTokenPayload {
  sessionId: string;
  candidateIdentifier: string;
  examId: string;
  scope: 'CANDIDATE';
}

export type DecodedAdminToken = AdminTokenPayload & jwt.JwtPayload;
export type DecodedCandidateToken = CandidateTokenPayload & jwt.JwtPayload;

const AUTH_ISSUER = 'cbt-auth-authority';
const ADMIN_AUDIENCE = 'cbt-admin-portal';
const CANDIDATE_AUDIENCE = 'cbt-candidate-portal';

/**
 * Signs an Admin Access Token with strict audience and issuer constraints.
 */
export function signAdminAccessToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    issuer: AUTH_ISSUER,
    audience: ADMIN_AUDIENCE,
    expiresIn: env.JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Signs an Admin Refresh Token.
 */
export function signAdminRefreshToken(payload: Pick<AdminTokenPayload, 'adminId'>): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    issuer: AUTH_ISSUER,
    audience: ADMIN_AUDIENCE,
    expiresIn: env.JWT_REFRESH_EXPIRATION as jwt.SignOptions['expiresIn'],
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
export function verifyAdminAccessToken(token: string): DecodedAdminToken {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: AUTH_ISSUER,
    audience: ADMIN_AUDIENCE,
  }) as DecodedAdminToken;

  if (decoded.scope !== 'ADMIN') {
    throw new Error('Access denied: Token is not scoped for administrative operations.');
  }

  return decoded;
}

/**
 * Verifies and decodes an Admin Refresh Token.
 */
export function verifyAdminRefreshToken(token: string): { adminId: string } & jwt.JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: AUTH_ISSUER,
    audience: ADMIN_AUDIENCE,
  }) as { adminId: string } & jwt.JwtPayload;
}

/**
 * Computes the SHA-256 hash of a raw token string for DB lookup.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
