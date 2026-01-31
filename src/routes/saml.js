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
import { supabase } from '../config/supabase.js'; // Import Supabase client
import { signToken } from '../config/jwt.js'; // Import JWT signer
import signature from 'cookie-signature';
import { recordLoginAttendance, recordLogoutAttendance } from '../utils/attendanceHelper.js';

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
// Helper to determine the redirect origin (for RelayState)
const getRedirectOrigin = (req) => {
  // 1. Check for explicit redirect_to param
  // 2. Check for Origin header (if valid and allowed)
  // 3. Check for Referer header

  let redirectOrigin = req.query.redirect_to;

  if (!redirectOrigin) {
    const origin = req.headers.origin;
    // Basic validation to ensure we only redirect to allowed domains
    if (origin && (origin.includes('localhost') || origin.includes('netlify.app'))) {
      redirectOrigin = origin;
    }
  }

  // Fallback to Referer if safe
  if (!redirectOrigin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      if (refererUrl.origin.includes('localhost') || refererUrl.origin.includes('netlify.app')) {
        redirectOrigin = refererUrl.origin;
      }
    } catch (e) {
      // invalid url
    }
  }

  if (redirectOrigin) {
    console.log(`📍 Identified redirect origin for RelayState: ${redirectOrigin}`);
    return redirectOrigin;
  }

  return null;
};

router.get('/login', (req, res, next) => {
  // Check if there's a pending card scan
  const pendingCardId = req.session.pendingCardId;

  if (pendingCardId) {
    console.log(`🔐 Starting SAML login for card scan: ${pendingCardId}`);
  } else {
    console.log('🔐 Starting SAML login (manual)');
  }

  // Determine redirect origin for RelayState
  const relayState = getRedirectOrigin(req);

  // Default to worker if no specific role is requested
  req.session.loginRole = 'worker';

  // Initiate SAML authentication
  // Passport will redirect to STA entry point
  const authOptions = {
    failureRedirect: '/login',
    failureFlash: true,
  };

  // Pass RelayState to STA (it will be echoed back in ACS)
  if (relayState) {
    authOptions.additionalParams = {
      'RelayState': relayState
    };
  }

  passport.authenticate('saml', authOptions)(req, res, next);
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

    // CRITICAL FIX: Sync to Passport Session
    // We overwrite the raw SAML profile in passport's storage with our rich user object
    // This ensures req.user is populated correctly on subsequent requests
    if (req.session.passport) {
      req.session.passport.user = req.session.user;
    }
    // Also update current request user
    req.user = req.session.user;

    console.log(`✅ [SAML] Session created for ${samlUser.email} as ${req.session.user.role}`);

    // Automatically record attendance login for workers
    let attendanceMsg = null;
    if (req.session.user.role === 'worker' && req.session.user.workerId) {
      try {
        const attendanceResult = await recordLoginAttendance(req.session.user.workerId);
        attendanceMsg = attendanceResult.message;
        console.log(`🕒 [SAML Attendance] ${attendanceMsg}`);
      } catch (err) {
        console.error('Failed to record SAML login attendance:', err);
      }
    }

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
      // Check if we have a stored redirect origin cookie
      // Get the appropriate redirect URL based on device type
      // Check if we have a RelayState (from IdP) or stored cookie
      let dynamicBaseUrl = null;

      // 1. Check RelayState (Robust: persists across IdP hop)
      if (req.body.RelayState) {
        dynamicBaseUrl = req.body.RelayState;
        console.log(`🎯 Found RelayState for redirect: ${dynamicBaseUrl}`);
      }
      // 2. Fallback to cookie (Legacy/Backup)
      else if (req.cookies && req.cookies.saml_redirect_origin) {
        dynamicBaseUrl = req.cookies.saml_redirect_origin;
        console.log(`found validated redirect origin cookie: ${dynamicBaseUrl}`);
        // Clear the cookie
        res.clearCookie('saml_redirect_origin');
      }

      let redirectUrl = getRedirectUrl(req, redirectPath, dynamicBaseUrl);

      // ALWAYS append session token to URL (Universal Fallback)
      // This solves 3rd-party cookie blocking for Web (Netlify <-> Render)
      // And treats Android WebView cookie issues for Mobile
      try {
        // 1. Session Token (for Mobile/Legacy)
        // Sign the session ID with the secret (to match what express-session expects)
        const signedSessionId = 's:' + signature.sign(req.sessionID, process.env.SESSION_SECRET);

        // 2. JWT Token (for Web/Start modern flow)
        const jwtToken = signToken(req.session.user);

        // Append to URL
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}session_token=${encodeURIComponent(signedSessionId)}&token=${encodeURIComponent(jwtToken)}`;

        if (attendanceMsg) {
          redirectUrl = `${redirectUrl}&attendanceMessage=${encodeURIComponent(attendanceMsg)}`;
        }

        console.log(`🔑 [Auth] Appended session token AND JWT to redirect URL`);
      } catch (e) {
        console.error('Error signing session/JWT token:', e);
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
/* URL: /login/worker - ORIGINAL IMPLEMENTATION
router.get('/login/worker',
  (req, res, next) => {
    req.session.loginRole = 'worker'; // Set intent
    console.log('🔒 Initiating Forced Worker Login');

    // Determine redirect origin for RelayState
    const rs = getRedirectOrigin(req);
    req.relayState = rs;

    next();
  },
  (req, res, next) => {
    const authOptions = {
      failureRedirect: '/login',
      failureFlash: true,
      additionalParams: {
        'ForceAuthn': 'true'
      }
    };

    if (req.relayState) {
      authOptions.additionalParams['RelayState'] = req.relayState;
    }

    passport.authenticate('saml', authOptions)(req, res, next);
  }
);
*/
router.get('/login/worker',
  async (req, res, next) => {
    console.log('🔓 BYPASSING SAML: Forced Worker Login');
    req.session.loginRole = 'worker';

    // Mock User for Worker Bypass
    const mockWorker = {
      nameID: 'worker_bypass@example.com',
      workerId: 'WORKER_BYPASS_001',
      employeeNumber: 'WORKER_BYPASS_001',
      email: 'worker_bypass@example.com',
      firstName: 'Bypass',
      lastName: 'Worker',
      name: 'Bypass Worker',
      cardId: 'WORKER_BYPASS_001',
      establishmentId: null,
      role: 'worker'
    };

    req.session.user = mockWorker;
    // CRITICAL FIX: Sync to Passport Session
    if (!req.session.passport) req.session.passport = {};
    req.session.passport.user = mockWorker;
    req.user = mockWorker;

    // Automatically record attendance login for worker bypass
    let attendanceMsg = null;
    try {
      const attendanceResult = await recordLoginAttendance(mockWorker.workerId);
      attendanceMsg = attendanceResult.message;
      console.log(`🕒 [Bypass Attendance] ${attendanceMsg}`);
    } catch (err) {
      console.error('Failed to record bypass login attendance:', err);
    }

    // Determine redirect origin
    // Use getRedirectOrigin to be safe, or just check headers/query manually
    // The original code used getRedirectOrigin(req)
    const rs = getRedirectOrigin(req);
    let dynamicBaseUrl = rs;

    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).send('Session save error');
      }

      const redirectPath = '/dashboard/worker';
      // getRedirectUrl is imported in the file
      let redirectUrl = getRedirectUrl(req, redirectPath, dynamicBaseUrl);

      try {
        // Generate tokens
        const signedSessionId = 's:' + signature.sign(req.sessionID, process.env.SESSION_SECRET);
        const jwtToken = signToken(req.session.user);

        // Append to URL
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}session_token=${encodeURIComponent(signedSessionId)}&token=${encodeURIComponent(jwtToken)}`;

        if (attendanceMsg) {
          redirectUrl = `${redirectUrl}&attendanceMessage=${encodeURIComponent(attendanceMsg)}`;
        }

        console.log(`🔑 [Auth Bypass] Appended session token AND JWT to redirect URL`);
      } catch (e) {
        console.error('Error signing session/JWT token:', e);
      }

      console.log(`🚀 Bypassed redirect to: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    });
  }
);

// Establishment Specific Login (Forces Auth)
/* URL: /login/establishment - ORIGINAL IMPLEMENTATION
router.get('/login/establishment',
  (req, res, next) => {
    req.session.loginRole = 'establishment'; // Set intent
    console.log('🏢 Initiating Forced Establishment Login');

    // Determine redirect origin for RelayState
    const rs = getRedirectOrigin(req);
    req.relayState = rs;

    next();
  },
  (req, res, next) => {
    const authOptions = {
      failureRedirect: '/login',
      failureFlash: true,
      additionalParams: {
        'ForceAuthn': 'true'
      }
    };

    if (req.relayState) {
      authOptions.additionalParams['RelayState'] = req.relayState;
    }

    passport.authenticate('saml', authOptions)(req, res, next);
  }
);
*/
router.get('/login/establishment',
  async (req, res, next) => {
    console.log('🏢 BYPASSING SAML: Forced Establishment Login');
    req.session.loginRole = 'establishment';

    // Mock User for Establishment Bypass
    const mockEstablishment = {
      nameID: 'establishment_bypass@example.com',
      workerId: 'EST_BYPASS_001',
      employeeNumber: 'EST_BYPASS_001',
      email: 'establishment_bypass@example.com',
      firstName: 'Bypass',
      lastName: 'Establishment',
      name: 'Bypass Establishment',
      cardId: 'EST_BYPASS_001',
      establishmentId: 'EST_BYPASS_ID',
      role: 'establishment'
    };

    req.session.user = mockEstablishment;
    // CRITICAL FIX: Sync to Passport Session
    if (!req.session.passport) req.session.passport = {};
    req.session.passport.user = mockEstablishment;
    req.user = mockEstablishment;

    // Determine redirect origin
    const rs = getRedirectOrigin(req);
    let dynamicBaseUrl = rs;

    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).send('Session save error');
      }

      const redirectPath = '/dashboard/establishment';
      let redirectUrl = getRedirectUrl(req, redirectPath, dynamicBaseUrl);

      try {
        // Generate tokens
        const signedSessionId = 's:' + signature.sign(req.sessionID, process.env.SESSION_SECRET);
        const jwtToken = signToken(req.session.user);

        // Append to URL
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}session_token=${encodeURIComponent(signedSessionId)}&token=${encodeURIComponent(jwtToken)}`;

        console.log(`🔑 [Auth Bypass] Appended session token AND JWT to redirect URL`);
      } catch (e) {
        console.error('Error signing session/JWT token:', e);
      }

      console.log(`🚀 Bypassed redirect to: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    });
  }
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
router.post('/logout', requireSamlAuth, async (req, res) => {
  const user = req.session.user; // Use req.session.user which has role and workerId
  const workerId = user?.workerId;

  console.log('🚪 Logging out user:', user?.email || user?.nameID || 'unknown');

  // Automatically record attendance logout for workers
  let attendanceMsg = null;
  if (user?.role === 'worker' && workerId) {
    try {
      const attendanceResult = await recordLogoutAttendance(workerId);
      attendanceMsg = attendanceResult.message;
      console.log(`🕒 [SAML Logout Attendance] ${attendanceMsg}`);
    } catch (err) {
      console.error('Failed to record logout attendance:', err);
    }
  }

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
          message: attendanceMsg || 'Logout successful',
          attendanceMessage: attendanceMsg,
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
/* CARD SCANNER NOT PRESENT
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
    // VALIDATE CREDENTIALS IN SUPABASE
    // ============================================

    // Check if worker exists with this card ID
    // We check against multiple possible identifier columns to be robust
    let workerQuery = supabase
      .from('worker')
      .select('worker_id, first_name, status')
      .or(`access_card_id.eq.${trimmedCardId},e_card_id.eq.${trimmedCardId}`);

    // If cardId is numeric, also check worker_id
    if (!isNaN(trimmedCardId)) {
      workerQuery = supabase
        .from('worker')
        .select('worker_id, first_name, status')
        .or(`worker_id.eq.${trimmedCardId},access_card_id.eq.${trimmedCardId},e_card_id.eq.${trimmedCardId}`);
    }

    const { data: workers, error: dbError } = await workerQuery;

    if (dbError) {
      console.error('❌ Supabase check error:', dbError);
      return res.status(500).json(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Database validation failed', 'db'));
    }

    // Check if any worker found
    if (!workers || workers.length === 0) {
      console.warn(`⚠️ User not found for card ID: ${trimmedCardId}`);
      return res.status(404).json(
        errorResponse(ERROR_CODES.NOT_FOUND, 'User not found in system. Please contact administrator.', 'userNotFound')
      );
    }

    // Check status
    const worker = workers[0];
    if (worker.status !== 'active') {
      console.warn(`⚠️ User found but inactive: ${worker.worker_id}`);
      return res.status(403).json(
        errorResponse(ERROR_CODES.AUTHORIZATION_ERROR, 'User account is inactive.', 'inactive')
      );
    }

    console.log(`✅ Validated user in Supabase: ${worker.first_name} (ID: ${worker.worker_id})`);

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
*/

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



