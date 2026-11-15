import { verifyAdminAccessToken } from '../security/jwt.js';
import { query } from '../database/connection.js';
export async function requireAdminAuth(req, res, next) {
    try {
        let token;
        // 1. Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.cookies?.cbt_admin_access) {
            // 2. Check HttpOnly cookie
            token = req.cookies.cbt_admin_access;
        }
        if (!token) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No administrative authorization token provided.',
            });
            return;
        }
        // 3. Cryptographic token verification
        const decoded = verifyAdminAccessToken(token);
        // 4. Verify admin status in database
        const adminResult = await query('SELECT id, email, full_name, role, is_active FROM admins WHERE id = $1', [decoded.adminId]);
        if (adminResult.rows.length === 0) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Administrative account no longer exists.',
            });
            return;
        }
        const admin = adminResult.rows[0];
        if (!admin.is_active) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'This administrative account has been deactivated.',
            });
            return;
        }
        req.admin = {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            fullName: admin.full_name,
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            error: 'Unauthorized',
            message: error.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid administrative token.',
        });
    }
}
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
            return;
        }
        if (!allowedRoles.includes(req.admin.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Insufficient privileges. Required role: ${allowedRoles.join(' or ')}.`,
            });
            return;
        }
        next();
    };
}
