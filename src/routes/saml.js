/**
 * SAML Authentication Routes
 * 
 * This file contains all SAML-related routes for authentication
 * with SafeNet Trusted Access (STA) as the Identity Provider.
 * 
 * Routes:
 * - GET  /saml/login     - Initiate SAML authentication
 * - POST /saml/acs       - Assertion Consumer Service (SAML callback)
 * - POST /saml/logout    - SAML logout handler
 * - GET  /metadata       - Service Provider metadata
 * - POST /card-scan      - Card reader scan endpoint
 */

import express from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { samlConfig, validateSamlConfig } from '../config/saml.js';
import { requireSamlAuth, getPendingCardId, clearSamlSession } from '../middleware/samlAuth.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

const router = express.Router();

// ============================================
// PASSPORT SAML STRATEGY SETUP
// ============================================

/**
 * Configure Passport SAML Strategy
 * 
 * This strategy handles the SAML authentication flow:
 * 1. Redirects user to STA for authentication
 * 2. Receives SAML response from STA
 * 3. Validates the response and extracts user attributes
 * 4. Creates/updates user session
 */
const samlStrategy = new SamlStrategy(
  samlConfig.getPassportSamlOptions(),
  async (profile, done) => {
    try {
      // Extract user attributes from SAML profile
      // The profile object contains attributes sent by STA
      const userAttributes = {
        // NameID is the primary identifier from STA
        nameID: profile.nameID || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        
        // Employee number / Card ID
        // This should match the cardId scanned by the card reader
        employeeNumber: profile.employeeNumber || 
                        profile['employeeNumber'] ||
                        profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        
        // Email (if available)
        email: profile.email || 
               profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        
        // Additional attributes
        firstName: profile.firstName || profile.givenName,
        lastName: profile.lastName || profile.surname,
        
        // Full profile for debugging
        fullProfile: profile
      };
      
      // Log the profile for debugging (remove in production)
      console.log('📋 SAML Profile received:', {
        nameID: userAttributes.nameID,
        employeeNumber: userAttributes.employeeNumber,
        email: userAttributes.email
      });
      
      // Return the user object to Passport
      // This will be attached to req.user after authentication
      return done(null, userAttributes);
      
    } catch (error) {
      console.error('❌ Error processing SAML profile:', error);
      return done(error, null);
    }
  }
);

// Register the SAML strategy with Passport
passport.use('saml', samlStrategy);

// Passport serialization (store user in session)
passport.serializeUser((user, done) => {
  done(null, user);
});

// Passport deserialization (retrieve user from session)
passport.deserializeUser((user, done) => {
  done(null, user);
});

// ============================================
// SAML ROUTES
// ============================================

/**
 * GET /saml/login
 * 
 * Initiates SAML authentication flow.
 * 
 * Flow:
 * 1. User (or card scan) calls this endpoint
 * 2. Redirects user to SafeNet Trusted Access login page
 * 3. User authenticates with STA
 * 4. STA redirects back to /saml/acs with SAML response
 * 
 * If there's a pending cardId in session, it will be validated
 * after successful authentication.
 */
router.get('/login', (req, res, next) => {
  // Check if there's a pending card scan
  const pendingCardId = req.session.pendingCardId;
  
  if (pendingCardId) {
    console.log(`🔐 Starting SAML login for card scan: ${pendingCardId}`);
  } else {
    console.log('🔐 Starting SAML login (manual)');
  }
  
  // Initiate SAML authentication
  // Passport will redirect to STA entry point
  passport.authenticate('saml', {
    // Additional parameters can be passed here
    // For example, to force re-authentication:
    // additionalParams: { ForceAuthn: 'true' }
  })(req, res, next);
});

/**
 * POST /saml/acs
 * 
 * Assertion Consumer Service (ACS) - SAML callback endpoint.
 * 
 * This is where SafeNet Trusted Access sends the SAML response
 * after the user authenticates.
 * 
 * Flow:
 * 1. STA redirects here with SAML response
 * 2. Passport validates the SAML response
 * 3. User profile is extracted and validated
 * 4. If cardId was scanned, validate it matches STA user
 * 5. Create session and redirect to dashboard
 */
router.post('/acs', 
  passport.authenticate('saml', { 
    failureRedirect: '/login',
    failureFlash: false 
  }),
  async (req, res) => {
    try {
      // After successful SAML authentication, req.user contains the user profile
      const samlUser = req.user;
      const pendingCardId = req.session.pendingCardId;
      
      console.log('✅ SAML authentication successful');
      console.log('👤 User:', {
        nameID: samlUser.nameID,
        employeeNumber: samlUser.employeeNumber
      });
      
      // ============================================
      // CARD ID VALIDATION
      // ============================================
      
      // If there's a pending card scan, validate the cardId
      if (pendingCardId) {
        console.log(`🔍 Validating card scan: ${pendingCardId}`);
        
        // Extract the identifier from SAML response
        // This could be NameID or employeeNumber attribute
        const userIdentifier = samlUser.employeeNumber || samlUser.nameID;
        
        // Validate that the STA user matches the scanned card
        if (userIdentifier !== pendingCardId) {
          console.error('❌ Card ID mismatch!');
          console.error(`   Scanned card: ${pendingCardId}`);
          console.error(`   STA user: ${userIdentifier}`);
          
          // Clear session and deny access
          clearSamlSession(req);
          req.logout((err) => {
            if (err) console.error('Logout error:', err);
          });
          
          return res.status(403).json(
            errorResponse(
              ERROR_CODES.AUTHORIZATION_ERROR,
              'Card ID does not match authenticated user. Access denied.',
              'cardValidation'
            )
          );
        }
        
        console.log('✅ Card ID validated successfully');
        
        // Clear pending cardId from session
        delete req.session.pendingCardId;
      }
      
      // ============================================
      // SESSION MANAGEMENT
      // ============================================
      
      // Store SAML user in session
      req.session.samlUser = {
        nameID: samlUser.nameID,
        employeeNumber: samlUser.employeeNumber,
        email: samlUser.email,
        firstName: samlUser.firstName,
        lastName: samlUser.lastName,
        authenticatedAt: new Date().toISOString()
      };
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          return res.status(500).json(
            errorResponse(
              ERROR_CODES.INTERNAL_ERROR,
              'Failed to save session',
              'session'
            )
          );
        }
        
        console.log('✅ Session saved successfully');
        
        // Redirect to dashboard after successful authentication
        // In a SPA, you might want to return JSON instead
        if (req.headers['content-type']?.includes('application/json')) {
          return res.json(successResponse({
            message: 'SAML authentication successful',
            user: req.session.samlUser,
            redirectTo: '/dashboard'
          }));
        }
        
        // HTML redirect (for browser-based flows)
        res.redirect('/dashboard');
      });
      
    } catch (error) {
      console.error('❌ Error in SAML ACS callback:', error);
      clearSamlSession(req);
      
      res.status(500).json(
        errorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          'SAML authentication failed',
          'saml'
        )
      );
    }
  }
);

/**
 * POST /saml/logout
 * 
 * SAML logout handler.
 * 
 * Flow:
 * 1. Clears local session
 * 2. Optionally initiates SAML logout with STA (Single Logout)
 * 3. Redirects to login page
 * 
 * This is called when:
 * - User explicitly logs out
 * - New card scan happens while user is logged in
 */
router.post('/logout', requireSamlAuth, (req, res) => {
  const user = req.session.samlUser;
  
  console.log('🚪 Logging out user:', user?.nameID || 'unknown');
  
  // Clear SAML session
  clearSamlSession(req);
  
  // Logout from Passport
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
    }
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
      }
      
      console.log('✅ Logout successful');
      
      // Return JSON response for API calls
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json(successResponse({
          message: 'Logout successful',
          redirectTo: '/login'
        }));
      }
      
      // HTML redirect
      res.redirect('/login');
    });
  });
});

/**
 * GET /metadata or GET /saml/metadata
 * 
 * Returns Service Provider (SP) metadata XML.
 * 
 * This metadata needs to be uploaded to SafeNet Trusted Access
 * to configure the Service Provider.
 * 
 * The metadata includes:
 * - Entity ID
 * - ACS URL
 * - Logout URL
 * - SP Certificate (for request signing)
 */
router.get('/metadata', (req, res) => {
  // Handle both /metadata and /saml/metadata
  return handleMetadata(req, res);
});

// Also handle root path when mounted at /metadata
router.get('/', (req, res) => {
  // If this is the metadata mount point, return metadata
  if (req.path === '/metadata' || req.originalUrl.includes('/metadata')) {
    return handleMetadata(req, res);
  }
  res.status(404).json({ error: 'Not found' });
});

function handleMetadata(req, res) {
  try {
    // Generate SP metadata using passport-saml
    const metadata = samlStrategy.generateServiceProviderMetadata(
      samlConfig.publicCert,  // SP certificate
      samlConfig.privateKey   // SP private key (for signing)
    );
    
    // Set content type to XML
    res.type('application/xml');
    res.send(metadata);
    
    console.log('📄 SP metadata requested');
    
  } catch (error) {
    console.error('❌ Error generating metadata:', error);
    res.status(500).json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to generate SAML metadata',
        'metadata'
      )
    );
  }
}

// Export metadata handler for use in server.js
export { handleMetadata };

/**
 * POST /card-scan
 * 
 * Card reader scan endpoint.
 * 
 * This endpoint receives the cardId from a card reader
 * (via serial port, USB, or HTTP request).
 * 
 * Flow:
 * 1. Receive cardId from card reader
 * 2. Store cardId in session (pendingCardId)
 * 3. If user is already logged in → logout first
 * 4. Redirect to /saml/login to start authentication
 * 
 * After SAML authentication completes, the cardId will be
 * validated against the STA user's employeeNumber/NameID.
 */
router.post('/card-scan', async (req, res) => {
  try {
    const { cardId } = req.body;
    
    // Validate cardId
    if (!cardId || typeof cardId !== 'string' || cardId.trim().length === 0) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'cardId is required and must be a non-empty string',
          'cardId'
        )
      );
    }
    
    const trimmedCardId = cardId.trim();
    console.log(`💳 Card scan received: ${trimmedCardId}`);
    
    // ============================================
    // CHECK IF USER IS ALREADY LOGGED IN
    // ============================================
    
    const isLoggedIn = req.session.samlUser && req.user;
    
    if (isLoggedIn) {
      const currentUser = req.session.samlUser;
      console.log(`🔄 User already logged in: ${currentUser.nameID}`);
      console.log(`   Logging out before processing new card scan...`);
      
      // Clear current session
      clearSamlSession(req);
      
      // Logout from Passport
      req.logout((err) => {
        if (err) {
          console.error('❌ Logout error during card scan:', err);
        }
      });
    }
    
    // ============================================
    // STORE CARD ID IN SESSION
    // ============================================
    
    // Store the scanned cardId in session
    // This will be validated after SAML authentication
    req.session.pendingCardId = trimmedCardId;
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json(
          errorResponse(
            ERROR_CODES.INTERNAL_ERROR,
            'Failed to save session',
            'session'
          )
        );
      }
      
      console.log(`✅ Card ID stored in session: ${trimmedCardId}`);
      console.log(`   Redirecting to SAML login...`);
      
      // ============================================
      // REDIRECT TO SAML LOGIN
      // ============================================
      
      // Return JSON response for API calls
      if (req.headers['content-type']?.includes('application/json')) {
        return res.json(successResponse({
          message: 'Card scan received. Redirecting to SAML login.',
          cardId: trimmedCardId,
          redirectTo: '/saml/login'
        }));
      }
      
      // HTML redirect to SAML login
      res.redirect('/saml/login');
    });
    
  } catch (error) {
    console.error('❌ Error processing card scan:', error);
    
    // Clear any partial session state
    clearSamlSession(req);
    
    res.status(500).json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to process card scan',
        'cardScan'
      )
    );
  }
});

/**
 * GET /saml/status
 * 
 * Check SAML authentication status.
 * 
 * Returns the current authentication status and user info.
 */
router.get('/status', (req, res) => {
  const isAuthenticated = req.session.samlUser && req.user;
  
  if (isAuthenticated) {
    return res.json(successResponse({
      authenticated: true,
      user: req.session.samlUser,
      pendingCardId: req.session.pendingCardId || null
    }));
  }
  
  res.json(successResponse({
    authenticated: false,
    user: null,
    pendingCardId: req.session.pendingCardId || null
  }));
});

/**
 * GET /saml/config
 * 
 * Returns SAML configuration status (for debugging).
 * Only available in development mode.
 */
router.get('/config', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json(
      errorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Configuration endpoint not available in production',
        'config'
      )
    );
  }
  
  const validation = validateSamlConfig();
  
  res.json(successResponse({
    configured: validation.valid,
    errors: validation.errors,
    config: {
      entityId: samlConfig.entityId,
      callbackUrl: samlConfig.callbackUrl,
      logoutUrl: samlConfig.logoutUrl,
      entryPoint: samlConfig.entryPoint ? '***configured***' : 'not configured',
      issuer: samlConfig.issuer ? '***configured***' : 'not configured',
      hasCert: !!samlConfig.cert && !samlConfig.cert.includes('YOUR_STA_CERTIFICATE'),
      hasPrivateKey: !!samlConfig.privateKey,
      hasPublicCert: !!samlConfig.publicCert
    }
  }));
});

export default router;



