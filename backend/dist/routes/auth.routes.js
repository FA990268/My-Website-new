import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { adminAuthRateLimiter } from '../security/rateLimiter.js';
import { requireAdminAuth, requireRole } from '../middleware/authMiddleware.js';
const router = Router();
// Public auth endpoints (guarded by brute force limiter)
router.post('/login', adminAuthRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
// Protected admin endpoints
router.get('/me', requireAdminAuth, AuthController.getMe);
router.get('/audit-logs', requireAdminAuth, requireRole(['SUPER_ADMIN']), AuthController.getAuditLogs);
export default router;
