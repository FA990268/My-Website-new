import { hashPassword, verifyPassword } from '../security/password.js';
import {
  signAdminAccessToken,
  verifyAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminRefreshToken,
} from '../security/jwt.js';
import { recordFailedAttempt, resetFailedAttempts } from '../security/rateLimiter.js';

async function runSelfTests() {
  console.log('🧪 Starting Phase 1 Security & Authentication Verification Suite...\n');

  // Test 1: Argon2id Password Hashing & Verification
  console.log('1️⃣ Testing Argon2id Hashing & Verification (OWASP 64MB memory cost)...');
  const samplePassword = 'AdminSecret#2026!Secure';
  const startHash = Date.now();
  const passwordHash = await hashPassword(samplePassword);
  const hashDuration = Date.now() - startHash;

  console.log(`   - Hash generation took: ${hashDuration}ms`);
  console.log(`   - Sample Hash: ${passwordHash.slice(0, 35)}...`);
  console.log(`   - Prefix verifies Argon2id algorithm: ${passwordHash.startsWith('$argon2id$')}`);

  const isMatchValid = await verifyPassword(samplePassword, passwordHash);
  const isMatchInvalid = await verifyPassword('WrongPassword#123', passwordHash);

  if (isMatchValid && !isMatchInvalid) {
    console.log('   ✅ PASS: Argon2id password verification validated (correct match succeeded, wrong password rejected).\n');
  } else {
    throw new Error('Argon2id verification failed logic check');
  }

  // Test 2: Admin Scoped JWT Authority
  console.log('2️⃣ Testing Admin JWT Token Authority & Scope Isolation...');
  const adminPayload = {
    adminId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'admin@cbt-portal.internal',
    role: 'SUPER_ADMIN' as const,
    fullName: 'System Administrator',
    scope: 'ADMIN' as const,
  };

  const token = signAdminAccessToken(adminPayload);
  console.log(`   - Generated Admin JWT: ${token.slice(0, 40)}...`);

  const decoded = verifyAdminAccessToken(token);
  console.log(`   - Verified Payload: AdminId=${decoded.adminId}, Role=${decoded.role}, Scope=${decoded.scope}`);
  console.log(`   - Verified Issuer & Audience: iss=${decoded.iss}, aud=${decoded.aud}`);

  if (decoded.scope === 'ADMIN' && decoded.role === 'SUPER_ADMIN') {
    console.log('   ✅ PASS: Admin token cryptographic verification & scope isolation validated.\n');
  } else {
    throw new Error('JWT token decoding failed scope check');
  }

  // Test 3: Refresh Token Signing & Hash Generation
  console.log('3️⃣ Testing Refresh Token Generation & SHA-256 Hash Storage...');
  const refreshResult = signAdminRefreshToken({ adminId: adminPayload.adminId });
  console.log(`   - Raw Token: ${refreshResult.rawToken.slice(0, 35)}...`);
  console.log(`   - DB Stored Token Hash (SHA-256): ${refreshResult.tokenHash}`);
  console.log(`   - Expiration Date: ${refreshResult.expiresAt.toISOString()}`);

  const decodedRefresh = verifyAdminRefreshToken(refreshResult.rawToken);
  if (decodedRefresh.adminId === adminPayload.adminId) {
    console.log('   ✅ PASS: Refresh token signing & validation passed.\n');
  } else {
    throw new Error('Refresh token validation mismatch');
  }

  // Test 4: Brute Force & Rate Limiting Protection
  console.log('4️⃣ Testing Brute-Force Rate Limiting Engine...');
  const testIp = '192.168.1.100';
  const testEmail = 'target-admin@cbt-portal.internal';

  // 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    const res = recordFailedAttempt(testIp, testEmail);
    console.log(`   - Failed Attempt ${i}: Remaining = ${res.remainingAttempts}, Locked = ${res.isLocked}`);
  }

  // 5th attempt (triggers lockout)
  const lockResult = recordFailedAttempt(testIp, testEmail);
  console.log(`   - 5th Failed Attempt: Remaining = ${lockResult.remainingAttempts}, Locked = ${lockResult.isLocked}`);

  if (lockResult.isLocked && lockResult.remainingAttempts === 0) {
    console.log('   ✅ PASS: Brute-force threshold triggered, account locked out successfully.');
  } else {
    throw new Error('Rate limiter failed to lock account after threshold');
  }

  resetFailedAttempts(testIp, testEmail);
  console.log('   - Counter reset executed successfully.\n');

  console.log('🎉 ALL SECURITY & AUTHENTICATION UNIT CHECKS PASSED SUCCESSFULLY!');
}

runSelfTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
