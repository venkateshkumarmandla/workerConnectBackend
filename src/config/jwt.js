import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Sign a JWT token with user payload
 * @param {Object} user - User object to sign
 * @returns {string} - Signed JWT token
 */
export const signToken = (user) => {
    // Minimize payload to essential data
    const payload = {
        nameID: user.nameID,
        employeeNumber: user.employeeNumber,
        email: user.email,
        role: user.role,
        workerId: user.workerId,
        type: 'auth'
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('❌ JWT Verification failed:', error.message);
        return null;
    }
};
