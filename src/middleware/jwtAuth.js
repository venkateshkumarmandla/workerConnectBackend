import { verifyToken } from '../config/jwt.js';

/**
 * Middleware to verify JWT Bearer token
 * Expects header: Authorization: Bearer <token>
 */
export const jwtAuthMixin = (req, res, next) => {
    // Skip if already authenticated via session
    if (req.user && req.session && req.session.user) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (decoded) {
            console.log(`🔓 [JWT] Token verified for user: ${decoded.email || decoded.nameID}`);

            // Hydrate request user
            req.user = decoded;

            // Hydrate session user (for compatibility with existing routes relying on req.session.user)
            if (req.session) {
                req.session.user = decoded;
                // Mark as fully authenticated in session if possible? 
                // Note: modify session with caution if it's not persistent, 
                // but for this request lifecycle it allows downstream controllers to work.
            }
        } else {
            console.warn('⚠️ [JWT] Invalid token provided');
        }
    }

    next();
};
