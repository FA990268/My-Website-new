const memoryStore = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
/**
 * Middleware protecting admin authentication endpoints against credential stuffing and brute force.
 */
export function adminAuthRateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').trim().toLowerCase();
    const key = `${ip}:${email}`;
    const now = Date.now();
    const record = memoryStore.get(key);
    if (record) {
        // Check if account/IP is locked
        if (record.lockedUntil && record.lockedUntil > now) {
            const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
            res.status(429).json({
                error: 'Too Many Requests',
                message: `Too many failed login attempts. This account is temporarily locked for ${waitSeconds} seconds.`,
                retryAfterSeconds: waitSeconds,
            });
            return;
        }
        // Reset window if expired
        if (now - record.firstAttemptAt > WINDOW_MS) {
            memoryStore.delete(key);
        }
    }
    next();
}
export function recordFailedAttempt(ip, email) {
    const key = `${ip}:${email.trim().toLowerCase()}`;
    const now = Date.now();
    const record = memoryStore.get(key) || { count: 0, firstAttemptAt: now };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
        memoryStore.set(key, record);
        return { remainingAttempts: 0, isLocked: true };
    }
    memoryStore.set(key, record);
    return { remainingAttempts: MAX_ATTEMPTS - record.count, isLocked: false };
}
export function resetFailedAttempts(ip, email) {
    const key = `${ip}:${email.trim().toLowerCase()}`;
    memoryStore.delete(key);
}
