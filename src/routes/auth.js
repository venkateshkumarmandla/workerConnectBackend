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
    // Check if user is authenticated (works for all auth types)
    const isAuthenticated = req.session && req.session.user;

    if (isAuthenticated) {
        return res.json({
            authenticated: true,
            user: req.session.user
        });
    }

    return res.status(401).json({
        authenticated: false,
        user: null
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

export default router;
