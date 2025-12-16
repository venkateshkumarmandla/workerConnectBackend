/**
 * Auth Routes
 * Provides authentication status and user information endpoints
 */

import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the current user's session information
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/user', (req, res) => {
    // Debug logging
    console.log('🔍 [Auth Check] Headers:', {
        origin: req.headers.origin,
        cookie: req.headers.cookie ? 'Present' : 'Missing',
        credentials: req.headers['access-control-request-credentials']
    });

    // Check if user is authenticated (works for all auth types)
    // 1. Check custom session user (priority, has role/workerId)
    // 2. Check passport user (fallback, basic profile)
    let user = req.session && req.session.user;
    let authSource = 'session.user';

    if (!user && req.user) {
        // Fallback to passport user
        user = req.user;
        authSource = 'req.user (Passport)';
        console.log('⚠️ [Auth Check] using req.user fallback (session.user missing)');

        // Try to repair session if we have the passport user
        if (req.session) {
            req.session.user = user;
            console.log('🔧 [Auth Check] Repaired req.session.user from req.user');
        }
    }

    // Extended debug info
    console.log('🔍 [Auth Check] Session State:', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasSessionUser: !!(req.session && req.session.user),
        hasPassportUser: !!req.user,
        authSource: user ? authSource : 'none'
    });

    if (user) {
        console.log('✅ [Auth Check] User authenticated:', user.email || user.nameID);
        return res.json({
            authenticated: true,
            user: user,
            // Include debug info in success response too if needed, but usually clean is better
            // source: authSource 
        });
    }

    console.log('❌ [Auth Check] No authentication found');
    return res.status(401).json({
        authenticated: false,
        user: null,
        debug: {
            sessionExists: !!req.session,
            sessionID: req.sessionID,
            hasCookie: !!req.headers.cookie,
            hasPassportUser: !!req.user,
            headers: req.headers['x-session-token'] ? 'Token Present' : 'No Token'
        }
    });
});

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Get authentication status
 *     description: Check if the current session is authenticated
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication status
 */
router.get('/status', (req, res) => {
    const isAuthenticated = req.session && req.session.user;

    res.json({
        authenticated: isAuthenticated,
        user: isAuthenticated ? req.session.user : null
    });
});

/**
 * @swagger
 * /api/auth/session-info:
 *   get:
 *     summary: Get session configuration info (debugging)
 *     description: Returns session configuration details for debugging
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Session configuration info
 */
router.get('/session-info', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasSessionUser: !!(req.session && req.session.user),
        cookies: {
            hasCookie: !!req.headers.cookie,
            cookieHeader: req.headers.cookie,
            cookieNames: req.headers.cookie ? req.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : []
        },
        headers: {
            origin: req.headers.origin,
            referer: req.headers.referer,
            host: req.headers.host,
            userAgent: req.headers['user-agent']
        },
        config: {
            nodeEnv: process.env.NODE_ENV,
            cookieSettings: {
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                httpOnly: true,
                maxAge: '24 hours'
            }
        }
    });
});

export default router;
