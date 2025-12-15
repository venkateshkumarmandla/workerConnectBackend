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
import { getDeviceInfo, getRedirectUrl, isMobileApp } from '../utils/deviceDetection.js';
import signature from 'cookie-signature';

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
 * @swagger
 * /saml/login:
 *   get:
 *     summary: Initiate SAML authentication
 *     description: |
 *       Initiates SAML authentication flow with SafeNet Trusted Access.
 *       Redirects user to STA login page. After authentication, STA redirects to /saml/acs.
 *       
 *       If there's a pending cardId in session (from /card-scan), it will be validated
 *       after successful authentication.
 *     tags: [SAML Authentication]
 *     responses:
 *       302:
 *         description: Redirects to SafeNet Trusted Access login page
 *       500:
 *         description: Server error
 */
router.get('/login', (req, res, next) => {
  // Check if there's a pending card scan
  const pendingCardId = req.session.pendingCardId;

  if (pendingCardId) {
    console.log(`🔐 Starting SAML login for card scan: ${pendingCardId}`);
  } else {
    console.log('🔐 Starting SAML login (manual)');
  }

  // Default to worker if no specific role is requested
  req.session.loginRole = 'worker';

  // Initiate SAML authentication
  // Passport will redirect to STA entry point
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

/**
 * Shared ACS Handler Logic
 * Used for both POST (standard) and GET (proxy) flows
 */
const acsHandler = async (req, res) => {
  try {
    // After successful SAML authentication, req.user contains the user profile
    const samlUser = req.user;
    const pendingCardId = req.session.pendingCardId;

    console.log('✅ SAML authentication successful');
    console.log('👤 User:', {
      nameID: samlUser.nameID,
      employeeNumber: samlUser.employeeNumber
    });

    // Log device information for debugging
    const deviceInfo = getDeviceInfo(req);
    console.log('📱 Device Info:', deviceInfo);

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
    // IMPORTANT: Mapping to structure expected by frontend and other controllers
    req.session.user = {
      nameID: samlUser.nameID,
      workerId: samlUser.employeeNumber, // Important: using employeeNumber as workerId
      employeeNumber: samlUser.employeeNumber,
      email: samlUser.email,
      firstName: samlUser.firstName,
      lastName: samlUser.lastName,
      name: `${samlUser.firstName} ${samlUser.lastName || ''}`.trim(),
      cardId: samlUser.employeeNumber, // Same as workerId for card auth
      establishmentId: null, // This will be populated if we can link it, or handled by frontend state
      role: req.session.loginRole || 'worker', // Use intended role or default to worker
    };

    console.log(`✅ [SAML] Session created for ${samlUser.email} as ${req.session.user.role}`);

    // ============================================
    // SMART DEVICE-BASED REDIRECT
    // ============================================

    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).send('Session save error');
      }

      const targetRole = req.session.user.role;
      let redirectPath = '/dashboard/worker'; // Default

      // Determine dashboard path based on role
      if (targetRole === 'establishment') {
        redirectPath = '/dashboard/establishment';
      } else if (targetRole === 'department') {
        redirectPath = '/dashboard/department';
      }

      // Get the appropriate redirect URL based on device type
      let redirectUrl = getRedirectUrl(req, redirectPath);

      // ALWAYS append session token to URL (Universal Fallback)
      // This solves 3rd-party cookie blocking for Web (Netlify <-> Render)
      // And treats Android WebView cookie issues for Mobile
      try {
        // Sign the session ID with the secret (to match what express-session expects)
        const signedSessionId = 's:' + signature.sign(req.sessionID, process.env.SESSION_SECRET);

        // Append to URL
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}session_token=${encodeURIComponent(signedSessionId)}`;

        console.log(`🔑 [Auth] Appended session token to redirect URL for fallback`);
      } catch (e) {
        console.error('Error signing session token:', e);
      }

      console.log(`🚀 Redirecting ${deviceInfo.isMobileApp ? 'mobile app' : 'web browser'} to: ${redirectUrl}`);

      return res.redirect(redirectUrl);
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
};

/**
 * @swagger
 * /saml/acs:
 *   get:
 *     summary: Internal Proxy for ACS (GET -> POST)
 *     description: |
 *       Handles GET requests from STA (misconfigured Redirect binding) by transforming
 *       them into POST requests internally. This allows the backend to accept the
 *       SAMLResponse from the query string and process it securely as if it were a POST.
 *     tags: [SAML Authentication]
 */
// GET Handler (Proxy Logic)
router.get('/acs', (req, res, next) => {
  if (req.query.SAMLResponse) {
    console.log('🔄 [Proxy] Transforming GET SAMLResponse to POST format');

    // Inject into body
    req.body = req.body || {};
    req.body.SAMLResponse = req.query.SAMLResponse;
    if (req.query.RelayState) {
      req.body.RelayState = req.query.RelayState;
    }

    // Spoof method for passport-saml
    req.method = 'POST';

    // Continue to auth logic
    return next();
  }

  // Fallback if no SAMLResponse
  return res.status(400).send('SAMLResponse missing in GET request');
},
  // Chain standard authentication
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: false
  }),
  // Use the shared ACS logic
  acsHandler);

// --- 1. LOGIN ROUTES ---

// Standard Login -> See line 118 for the main /login handler
// (We removed the duplicate here)

// Worker Specific Login (Forces Auth)
router.get('/login/worker',
  (req, res, next) => {
    req.session.loginRole = 'worker'; // Set intent
    console.log('🔒 Initiating Forced Worker Login');
    next();
  },
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true,
    additionalParams: {
      'ForceAuthn': 'true'
    }
  })
);

// Establishment Specific Login (Forces Auth)
router.get('/login/establishment',
  (req, res, next) => {
    req.session.loginRole = 'establishment'; // Set intent
    console.log('🏢 Initiating Forced Establishment Login');
    next();
  },
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true,
    additionalParams: {
      'ForceAuthn': 'true'
    }
  })
);

/**
 * @swagger
 * /saml/acs:
 *   post:
 *     summary: SAML Assertion Consumer Service (ACS) callback
 *     description: |
 *       This is the callback endpoint where SafeNet Trusted Access sends the SAML response
 *       after user authentication. This endpoint is called automatically by STA.
 *       
 *       Flow:
 *       1. STA redirects here with SAML response
 *       2. Backend validates the SAML response
 *       3. User profile is extracted and validated
 *       4. If cardId was scanned, validate it matches STA user
 *       5. Create session and redirect to dashboard
 *     tags: [SAML Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               SAMLResponse:
 *                 type: string
 *                 description: Base64 encoded SAML response from STA
 *     responses:
 *       302:
 *         description: Redirects to /dashboard on success, /login on failure
 *       403:
 *         description: Card ID validation failed
 *       500:
 *         description: Server error
 */
router.post('/acs',
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: false
  }),
  acsHandler
);

/**
 * @swagger
 * /saml/logout:
 *   post:
 *     summary: SAML logout
 *     description: |
 *       Logs out the current SAML-authenticated user.
 *       Clears local session and optionally initiates SAML logout with STA.
 *       
 *       This is called when:
 *       - User explicitly logs out
 *       - New card scan happens while user is logged in
 *     tags: [SAML Authentication]
 *     security:
 *       - samlAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       302:
 *         description: Redirects to /login
 *       401:
 *         description: Not authenticated
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
 * @swagger
 * /metadata:
 *   get:
 *     summary: Get Service Provider (SP) metadata XML
 *     description: |
 *       Returns the SAML Service Provider metadata in XML format.
 *       This metadata should be uploaded to SafeNet Trusted Access to configure the SP.
 *       
 *       The metadata includes:
 *       - Entity ID
 *       - Assertion Consumer Service (ACS) URL
 *       - Single Logout Service (SLO) URL
 *       - SP Certificate (for request signing)
 *     tags: [SAML Authentication]
 *     responses:
 *       200:
 *         description: SAML metadata XML
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *               format: xml
 *       500:
 *         description: Failed to generate metadata
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
    // IMPORTANT: Do NOT pass the private key here - only public certificate
    // The signature is: generateServiceProviderMetadata(decryptionCert, signingCert)
    // Both should be PUBLIC certificates, never private keys
    const metadata = samlStrategy.generateServiceProviderMetadata(
      samlConfig.publicCert,  // Decryption certificate (public)
      samlConfig.publicCert   // Signing certificate (public) - same cert for both
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
 * @swagger
 * /card-scan:
 *   post:
 *     summary: Card reader scan endpoint
 *     description: |
 *       Receives cardId from a card reader and initiates SAML authentication.
 *       
 *       Flow:
 *       1. Receive cardId from card reader
 *       2. Store cardId in session (pendingCardId)
 *       3. If user is already logged in → logout first
 *       4. Redirect to /saml/login to start authentication
 *       
 *       After SAML authentication completes, the cardId will be validated
 *       against the STA user's employeeNumber/NameID.
 *     tags: [SAML Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardId
 *             properties:
 *               cardId:
 *                 type: string
 *                 description: Card ID scanned by the card reader
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: Card scan received, redirecting to SAML login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       302:
 *         description: Redirects to /saml/login
 *       400:
 *         description: Invalid cardId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /saml/status:
 *   get:
 *     summary: Check SAML authentication status
 *     description: Returns the current SAML authentication status and user information
 *     tags: [SAML Authentication]
 *     responses:
 *       200:
 *         description: Authentication status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAuthenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   nullable: true
 */
router.get('/status', (req, res) => {
  // Check both Passport session and our custom session user
  const isAuthenticated = req.isAuthenticated() || (req.session && req.session.user);

  if (isAuthenticated) {
    const user = req.session.user || req.user;
    return res.json({
      isAuthenticated: true,
      user: user
    });
  }

  res.json({
    isAuthenticated: false
  });
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



