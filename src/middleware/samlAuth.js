/**
 * SAML Authentication Middleware
 * 
 * This middleware handles SAML authentication and provides
 * utilities for checking authentication status and protecting routes.
 */

import { errorResponse, ERROR_CODES } from '../utils/response.js';

/**
 * Middleware to check if user is authenticated via SAML
 * 
 * This checks if req.user exists (set by passport after SAML authentication)
 * and if the session contains a valid SAML user.
 */
export const requireSamlAuth = (req, res, next) => {
  // Check if user is authenticated via SAML
  if (!req.user || !req.session.samlUser) {
    return res.status(401).json(
      errorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'SAML authentication required. Please login via /saml/login',
        'authentication'
      )
    );
  }
  
  // User is authenticated, proceed
  next();
};

/**
 * Middleware to check if a card scan is in progress
 * 
 * This checks if there's a pending cardId in the session
 * waiting for SAML authentication to complete.
 */
export const checkCardScanPending = (req, res, next) => {
  if (req.session.pendingCardId) {
    // There's a card scan waiting for authentication
    req.cardScanPending = true;
    req.pendingCardId = req.session.pendingCardId;
  }
  next();
};

/**
 * Helper function to get the authenticated user from session
 */
export const getSamlUser = (req) => {
  return req.session.samlUser || null;
};

/**
 * Helper function to get the pending card ID from session
 */
export const getPendingCardId = (req) => {
  return req.session.pendingCardId || null;
};

/**
 * Helper function to clear SAML session
 */
export const clearSamlSession = (req) => {
  if (req.session) {
    delete req.session.samlUser;
    delete req.session.pendingCardId;
    delete req.session.passport;
  }
};

export default {
  requireSamlAuth,
  checkCardScanPending,
  getSamlUser,
  getPendingCardId,
  clearSamlSession
};



