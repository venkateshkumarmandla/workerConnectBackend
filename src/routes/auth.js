/**
 * Auth Routes
 * Provides authentication status and user information endpoints
 */

import express from 'express';
import { recordLogoutAttendance } from '../utils/attendanceHelper.js';

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

/**
 * @swagger
 * /api/logout:
 *   all:
 *     summary: Logout user
 *     description: Destroys the current session and records attendance logout for workers
 *     tags: [Authentication]
 */
router.all('/logout', async (req, res) => {
    try {
        const user = req.user || (req.session && req.session.user);
        const workerId = user && (user.workerId || user.id);

        console.log(`Log out user: ${user?.email || user?.nameID || 'unknown'}`);

        // Automatically record attendance logout for workers
        let attendanceMsg = null;
        if (user && user.role === 'worker' && workerId) {
            console.log(`🕒 [Logout] Recording attendance for worker: ${workerId}`);
            try {
                const result = await recordLogoutAttendance(workerId);
                attendanceMsg = result.message;
            } catch (err) {
                console.error('Failed to record logout attendance:', err);
            }
        }

        // Handle Passport logout (sequential)
        if (req.logout) {
            await new Promise((resolve) => {
                req.logout({ keepSessionInfo: false }, (err) => {
                    if (err) console.error('Passport logout error:', err);
                    resolve();
                });
            });
            console.log('✅ [Logout] Passport logout completed');
        }

        // Destroy session
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                    return res.status(500).json({ success: false, message: 'Logout failed' });
                }
                res.clearCookie('saml.sid');
                console.log('✅ [Logout] Session destroyed successfully');
                return res.json({
                    success: true,
                    message: attendanceMsg || 'Logout successful',
                    attendanceMessage: attendanceMsg
                });
            });
        }
        else {
            return res.json({
                success: true,
                message: attendanceMsg || 'No session to logout',
                attendanceMessage: attendanceMsg
            });
        }
    } catch (error) {
        console.error('❌ [Logout] Error during logout:', error);
        res.status(500).json({ success: false, message: 'Logout error' });
    }
});

export default router;
