import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { errorResponse, ERROR_CODES } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password with hashed password
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json(
      errorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Access token is required',
        'authorization'
      )
    );
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Invalid or expired token',
        'authorization'
      )
    );
  }

  req.user = decoded;
  next();
};

/**
 * Authorization middleware - Check user role
 */
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'User not authenticated',
          'authorization'
        )
      );
    }

    if (!allowedRoles.includes(req.user.type)) {
      return res.status(403).json(
        errorResponse(
          ERROR_CODES.AUTHORIZATION_ERROR,
          'Access denied. Insufficient permissions.',
          'authorization'
        )
      );
    }

    next();
  };
};

/**
 * Verify worker owns the resource
 */
export const verifyWorkerOwnership = (req, res, next) => {
  const workerId = parseInt(req.params.workerId || req.body.workerId);

  if (!req.user || req.user.type !== 'worker') {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Worker authentication required',
        'authorization'
      )
    );
  }

  if (req.user.id !== workerId) {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'You can only access your own data',
        'workerId'
      )
    );
  }

  next();
};

/**
 * Verify establishment owns the resource
 */
export const verifyEstablishmentOwnership = (req, res, next) => {
  const establishmentId = parseInt(req.params.establishmentId || req.body.establishmentId);

  if (!req.user || req.user.type !== 'establishment') {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Establishment authentication required',
        'authorization'
      )
    );
  }

  if (req.user.id !== establishmentId) {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'You can only access your own data',
        'establishmentId'
      )
    );
  }

  next();
};

/**
 * Session-based authentication middleware
 * Checks if req.session.user exists
 */
/**
 * Session-based authentication middleware
 * Checks if req.session.user exists
 */
export const authenticateSession = (req, res, next) => {
  // Check if session exists and has samlUser (set in ACS) or login user
  // or checks req.isAuthenticated() from Passport if used

  if (req.session && req.session.user) {
    // Populate req.user for downstream controllers
    req.user = req.session.user;
    return next();
  }

  // Also check passport session if available
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json(
    errorResponse(
      ERROR_CODES.AUTHENTICATION_ERROR,
      'Session expired or invalid. Please login again.',
      'session'
    )
  );
};


