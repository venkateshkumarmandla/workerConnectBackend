/**
 * Device Detection Utility
 * 
 * Detects whether a request is coming from:
 * - Mobile App (React Native / Capacitor / Cordova)
 * - Web Browser (Desktop or Mobile)
 * 
 * Used for SAML redirects to send users to the correct platform.
 */

/**
 * Check if request is from a mobile app
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from mobile app
 */
export function isMobileApp(req) {
    // 1. Check custom header that mobile app should send
    if (req.headers['x-app-platform'] === 'mobile' || req.headers['x-client-type'] === 'mobile-app') {
        console.log('📱 Detected mobile app via custom header');
        return true;
    }

    // 2. Check origin for mobile app patterns
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
        const mobileOriginPatterns = [
            'http://localhost',          // React Native dev
            'capacitor://localhost',     // Capacitor iOS
            'ionic://localhost',         // Ionic
            'http://localhost:8080',     // Capacitor Android dev
            'file://',                   // Cordova
        ];

        const isFromMobileOrigin = mobileOriginPatterns.some(pattern => origin.startsWith(pattern));
        if (isFromMobileOrigin) {
            console.log(`📱 Detected mobile app via origin: ${origin}`);
            return true;
        }
    }

    // 3. Check User-Agent for mobile app identifiers
    const userAgent = req.headers['user-agent'] || '';
    const mobileAppIdentifiers = [
        'WorkerConnect',              // Your custom app identifier
        'WorkerConnectApp',
        'ReactNative',
        'Capacitor',
        'Cordova',
        'Ionic',
    ];

    const hasAppIdentifier = mobileAppIdentifiers.some(identifier =>
        userAgent.includes(identifier)
    );

    if (hasAppIdentifier) {
        console.log(`📱 Detected mobile app via User-Agent: ${userAgent}`);
        return true;
    }

    // 4. Check query parameter override (for testing/debugging)
    if (req.query.platform === 'mobile' || req.query.app === 'true') {
        console.log('📱 Detected mobile app via query parameter');
        return true;
    }

    // 5. Check session flag (set during initial mobile app login)
    if (req.session && req.session.isMobileApp) {
        console.log('📱 Detected mobile app via session flag');
        return true;
    }

    return false;
}

/**
 * Check if request is from a mobile browser (not app)
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from mobile browser
 */
export function isMobileBrowser(req) {
    const userAgent = req.headers['user-agent'] || '';

    const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i,
    ];

    const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));

    // Make sure it's not a mobile app (just a mobile browser)
    return isMobile && !isMobileApp(req);
}

/**
 * Check if request is from a desktop/laptop browser
 * @param {Object} req - Express request object
 * @returns {boolean} - True if request is from desktop browser
 */
export function isDesktopBrowser(req) {
    return !isMobileApp(req) && !isMobileBrowser(req);
}

/**
 * Get the appropriate redirect URL based on device type
 * @param {Object} req - Express request object
 * @param {string} path - Path to redirect to (e.g., '/dashboard/worker')
 * @returns {string} - Full redirect URL
 */
export function getRedirectUrl(req, path = '/') {
    const isMobile = isMobileApp(req);

    // Remove leading slash from path if exists for consistent concatenation
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (isMobile) {
        // Mobile app redirect
        const mobileUrl = process.env.MOBILE_APP_URL || 'http://localhost';
        console.log(`📱 Redirecting mobile app to: ${mobileUrl}${cleanPath}`);
        return `${mobileUrl}${cleanPath}`;
    } else {
        // Web browser redirect
        const webUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        console.log(`🌐 Redirecting web browser to: ${webUrl}${cleanPath}`);
        return `${webUrl}${cleanPath}`;
    }
}

/**
 * Get device information for logging/debugging
 * @param {Object} req - Express request object
 * @returns {Object} - Device information
 */
export function getDeviceInfo(req) {
    // Cache detection results to avoid multiple checks and logs
    const isMobile = isMobileApp(req);
    const isMobileBrow = !isMobile && isMobileBrowser(req);
    const isDesktop = !isMobile && !isMobileBrow;

    return {
        isMobileApp: isMobile,
        isMobileBrowser: isMobileBrow,
        isDesktopBrowser: isDesktop,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer,
        customHeaders: {
            'x-app-platform': req.headers['x-app-platform'],
            'x-client-type': req.headers['x-client-type'],
        },
    };
}

/**
 * Express middleware to detect and store device type in session
 * Usage: app.use(detectDeviceMiddleware);
 */
export function detectDeviceMiddleware(req, res, next) {
    if (isMobileApp(req)) {
        req.deviceType = 'mobile-app';
        // Store in session for future requests
        if (req.session) {
            req.session.isMobileApp = true;
        }
    } else if (isMobileBrowser(req)) {
        req.deviceType = 'mobile-browser';
    } else {
        req.deviceType = 'desktop-browser';
    }

    next();
}
