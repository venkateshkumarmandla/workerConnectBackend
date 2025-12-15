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

    console.log('🔍 [Auth Check] Session:', {
        exists: !!req.session,
        id: req.session?.id,
        hasUser: !!req.session?.user,
        user: req.session?.user ? {
            email: req.session.user.email,
            role: req.session.user.role
        } : null
    });

    // Check if user is authenticated (works for all auth types)
    const isAuthenticated = req.session && req.session.user;

    if (isAuthenticated) {
        console.log('✅ [Auth Check] User authenticated:', req.session.user.email);
        return res.json({
            authenticated: true,
            user: req.session.user
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
            cookieNames: req.headers.cookie ? req.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : []
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
