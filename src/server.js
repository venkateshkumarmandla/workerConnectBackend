import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { testConnection } from './config/supabase.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { validateSamlConfig } from './config/saml.js';
import signature from 'cookie-signature';

// Import routes
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/worker.js';
import establishmentRoutes from './routes/establishment.js';
import departmentRoutes from './routes/department.js';
import attendanceRoutes from './routes/attendance.js';
import locationRoutes from './routes/location.js';
import samlRoutes, { handleMetadata } from './routes/saml.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CLIENT_URL = process.env.CLIENT_URL;

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
// Allow all origins when FRONTEND_URL is '*' (for mobile app access)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Mobile apps often send null or no origin header
    if (!origin) {
      console.log('🔓 CORS: Allowing request with no origin (mobile app or tool)');
      return callback(null, true);
    }

    const allowedOrigins = [
      'https://dulcet-cobbler-4df9df.netlify.app',
      FRONTEND_URL,
      CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8100',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'file://',
      // SafeNet Trusted Access IdP origins
      'https://idp.eu.safenetid.com',
      'https://idp.safenetid.com',
      'https://idp.us.safenetid.com',
      'https://idp.ap.safenetid.com',
    ].filter(Boolean); // Remove undefined values

    // Normalize origin (remove trailing slash if present)
    const normalizedOrigin = origin.replace(/\/$/, '');

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) {
      console.log(`✅ CORS: Allowing origin: ${origin}`);
      callback(null, true);
    } else if (FRONTEND_URL === '*' || (CLIENT_URL && CLIENT_URL === '*')) {
      console.log(`✅ CORS: Allowing origin (wildcard enabled): ${origin}`);
      callback(null, true);
    } else {
      // For development, log but still allow
      console.log(`⚠️  CORS: Origin not in whitelist but allowing: ${origin}`);
      callback(null, true); // Still allowing for backward compatibility
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-App-Platform',      // Custom header for mobile app detection
    'X-Client-Type',       // Custom header for client type
    'X-App-Origin',        // ✅ Added: Custom header seen in logs
    'X-Device-Platform',   // ✅ Added: Custom header seen in logs
    'X-Session-Token',     // ✅ Added: For header-based session support
    'Cookie',
    'Set-Cookie'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours - Cache preflight requests
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// ============================================
// SESSION TOKEN SUPPORT (Mobile Fix)
// ============================================

/**
 * Middleware to support header-based sessions for mobile apps
 * If cookie is missing but X-Session-Token header exists, inject it as cookie
 */
app.use((req, res, next) => {
  if (!req.headers.cookie && req.headers['x-session-token']) {
    const token = req.headers['x-session-token'];
    // Reconstruct cookie string: saml.sid=<token>
    req.headers.cookie = `saml.sid=${token}`;
    console.log(`📱 [Mobile Session] Injected cookie from X-Session-Token header`);
  }
  next();
});

// ============================================
// PREFLIGHT REQUESTS HANDLER
// ============================================

// Handle OPTIONS requests for CORS preflight
// This ensures mobile apps can complete preflight checks
// Explicitly using the same corsOptions to ensure consistency
app.options('*', cors(corsOptions));

// ============================================
// SESSION CONFIGURATION
// ============================================

// Trust proxy is required for secure cookies behind a load balancer (like Render)
app.set('trust proxy', 1);

/**
 * Session middleware for SAML authentication
 * 
 * Sessions are required for:
 * - Storing SAML user information
 * - Tracking pending card scans
 * - Maintaining authentication state
 */

/**
 * Get dynamic cookie settings based on environment
 * This ensures cookies work in both production (HTTPS) and mobile apps (HTTP localhost)
 */
const getSessionCookieConfig = () => {
  // Check if running in production or on Render
  // Render sets environment variables like RENDER=true
  const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.ON_RENDER === 'true';

  if (isProduction) {
    console.log('🍪 Using PRODUCTION cookie settings (Secure, SameSite=None)');
    // Production: Secure cookies for HTTPS cross-origin (web browsers)
    return {
      secure: true,           // Require HTTPS
      httpOnly: true,         // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'none',       // Allow cross-origin for SAML
    };
  } else {
    console.log('🍪 Using DEVELOPMENT cookie settings (Not Secure, SameSite=Lax)');
    // Development: Relaxed cookies for HTTP localhost (mobile apps)
    return {
      secure: false,          // Allow HTTP for localhost
      httpOnly: true,         // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',        // Relaxed same-site for mobile
    };
  }
};

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false, // Don't create session until something is stored
  cookie: getSessionCookieConfig(),
  name: 'saml.sid', // Session cookie name
  proxy: true // trust first proxy
}));

// Session debugging middleware
app.use((req, res, next) => {
  // Log session info for auth-related requests
  if (req.path.includes('/api/auth') || req.path.includes('/saml')) {
    console.log(`📊 [Session] ${req.method} ${req.path}`);
    console.log(`   Protocol: ${req.protocol}, Secure: ${req.secure}, IP: ${req.ip}`);
    console.log(`   Has Session: ${!!req.session}, ID: ${req.sessionID}`);
    // Check if session has user (authenticated)
    console.log(`   Has User: ${!!(req.session && req.session.user)}`);
    console.log(`   Cookie Header: ${req.headers.cookie ? 'Present' : 'Missing'}`);

    // Log X-Session-Token explicitly
    if (req.headers['x-session-token']) {
      console.log(`   X-Session-Token: Present (${req.headers['x-session-token'].substring(0, 10)}...)`);
    }
  }
  next();
});

// ============================================
// PASSPORT INITIALIZATION
// ============================================

/**
 * Initialize Passport for SAML authentication
 * 
 * Passport is used to:
 * - Handle SAML authentication flow
 * - Manage user sessions
 * - Serialize/deserialize user objects
 */
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'WorkerConnect Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 database:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SWAGGER API DOCUMENTATION
// ============================================

/**
 * Swagger UI endpoint
 * Access the interactive API documentation at /api-docs
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WorkerConnect API Documentation',
  customfavIcon: '/favicon.ico'
}));

/**
 * Swagger JSON endpoint
 * Returns the OpenAPI specification in JSON format
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// SAML AUTHENTICATION ROUTES
// ============================================

/**
 * SAML authentication routes
 * 
 * Routes:
 * - GET  /saml/login     - Initiate SAML authentication
 * - POST /saml/acs       - SAML callback (Assertion Consumer Service)
 * - POST /saml/logout    - SAML logout
 * - GET  /metadata       - Service Provider metadata
 * - POST /card-scan      - Card reader scan endpoint
 * - GET  /saml/status    - Check authentication status
 * - GET  /saml/config    - SAML configuration status (dev only)
 */
app.use('/saml', samlRoutes);

// Direct metadata route handler
// This allows /metadata to work independently of /saml routes
app.get('/metadata', handleMetadata);

// ============================================
// API ROUTES
// ============================================

// API routes with /api prefix to match frontend
app.use('/api/auth', authRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/establishment', establishmentRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Location and master data routes (mapped to match existing API structure)
app.use('/api/location', locationRoutes);
app.use('/api', locationRoutes); // Also mount at /api root for establishmentcategory/details paths

// ============================================
// API COUNT ROUTE
// ============================================

/**
 * Infer related table based on route path
 */
const inferTable = (path) => {
  if (!path) return 'unknown';

  if (path.includes('/api/worker')) return 'worker';
  if (path.includes('/api/establishment')) return 'establishment';
  if (path.includes('/api/department')) return 'department_user';
  if (path.includes('/api/attendance')) return 'attendance_log';
  if (path.includes('/api/location')) return 'states, districts, cities';
  if (path.includes('/saml')) return 'saml_config';
  if (path.includes('/api-docs')) return 'swagger_docs';

  return 'system/other';
};

/**
 * Recursive function to get details of all registered routes
 */
const getRouteDetails = (stack, basePath = '') => {
  let routes = [];

  stack.forEach(layer => {
    if (layer.route) {
      // It's a route registered directly
      const path = basePath + layer.route.path;
      const validMethods = Object.keys(layer.route.methods)
        .filter(method => layer.route.methods[method])
        .map(method => method.toUpperCase());

      validMethods.forEach(method => {
        routes.push({
          method,
          path,
          relatedTable: inferTable(path)
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // It's a router middleware
      // Express routers use regex for matching, we try to extract the base path
      // This is a bit tricky with Express internals, but usually the regexp string is available
      // or we can look at the trim prefix if available.
      // For simplicity in this codebase structure, we might need a workaround or 
      // rely on the layer.regexp to guess the path if not explicit.

      // However, seeing how routes are mounted in this file:
      // app.use('/api/worker', workerRoutes);
      // We can iterate the stack passed to app.use, but getting the mount path 
      // from inside the router stack recursively is hard without passing it down.
      // But! In `app._router.stack`, the layer for a mounted router has a specific regex.
      // Parsing that regex to get the string path is complex.

      // ALTERNATIVE: Since we know the main mount points, we can traverse them manually 
      // OR we can try to extract from the regex fast path if available.

      // Let's rely on the fact that we can often "guess" the prefix from the regex source 
      // or manually map known routers if we wanted perfect precision.
      // But let's try a best effort extraction first.

      let prefix = '';
      if (layer.regexp.fast_slash) {
        prefix = '';
      } else {
        const match = layer.regexp.toString().match(/^\/\^\\\/([a-zA-Z0-9_\-\/]+)\\\//);
        if (match && match[1]) {
          prefix = '/' + match[1];
        } else {
          // Fallback for more complex regex or root mounts
          // If we can't detect it easily, we might miss the prefix.
          // Given the specific mounts in this file:
          // /api/worker, /saml, etc. are mounted with app.use(path, router)
        }

        // Better approach for Express 4:
        // The mount path is not easily stored in the layer itself in a string format.
        // It is stored in the unexpected way.
      }

      // Actually, for this specific request, we might want to just iterate the known routers 
      // if generic recursion is too flaky for mount points.
      // But let's try a simpler approach recursively ignoring the prefix issue for a moment
      // and see if we can just list the sub-routes.
      // WITHOUT the correct prefix, the paths will be partial (e.g. just `/register` instead of `/api/worker/register`).

      // To fix this properly without deep hacks:
      // We can manually call a helper for each known router if generic is hard.
      // OR we can look at the `path` property if it exists (some middleware modifications add it).

      // Let's try to pass the known prefixes based on how we mounted them in this file.
      // But we want this to be dynamic. 
      // Let's stick with the generic one, but if we see 'router', we dig in. 
      // *Problem*: We won't know the parent path (e.g. '/api/worker') easily.

      // Hacky but effective for standard Express apps:
      // Inspect `layer.regexp`

      const regexStr = layer.regexp.toString();
      // Example: /^\/api\/worker\/?(?=\/|$)/i
      const cleanPath = regexStr
        .replace(/^\/\^/, '') // remove start anchor
        .replace(/\\\//g, '/') // unescape slashes
        .replace(/\/\?\(.*$/, '') // remove end matching group
        .replace(/\/i$/, '') // remove flags
        .replace(/\/$/, ''); // remove trailing slash

      // Ensure we treat it as a segment
      const routerPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;

      // Avoid adding base path for global middlewares that match everything (fast_slash)
      const nextBase = layer.regexp.fast_slash ? basePath : (basePath + routerPath);

      routes = routes.concat(getRouteDetails(layer.handle.stack, nextBase));
    }
  });
  return routes;
};

/**
 * API Count endpoint
 * Returns the total number of registered API endpoints with details
 */
app.get('/api-count', (req, res) => {
  const routes = getRouteDetails(app._router.stack);

  res.json({
    count: routes.length,
    timestamp: new Date().toISOString(),
    endpoints: routes
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    console.log('🔄 Testing Supabase connection...');
    const connected = await testConnection();

    if (!connected) {
      console.error('⚠️  Database connection failed, but starting server anyway');
      console.error('   Please check your .env file and Supabase credentials');
    }

    // Start server - bind to 0.0.0.0 to allow external connections
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('============================================');
      console.log('🚀 WorkerConnect Backend API');
      console.log('============================================');
      console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
      console.log(`📱 Access via IP: http://[YOUR_LOCAL_IP]:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL || 'Not configured'}`);
      console.log(`🎯 Frontend URL: ${FRONTEND_URL}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('   GET  /');
      console.log('   GET  /health');
      console.log('');
      console.log('📚 API Documentation:');
      console.log('   GET  /api-docs       - Swagger UI (Interactive API Docs)');
      console.log('   GET  /api-docs.json  - OpenAPI JSON specification');
      console.log('');
      console.log('🔐 SAML Authentication:');
      console.log('   GET  /saml/login     - Start SAML authentication');
      console.log('   POST /saml/acs       - SAML callback');
      console.log('   POST /saml/logout    - Logout');
      console.log('   GET  /metadata       - SP metadata XML');
      console.log('   POST /card-scan      - Card reader scan');
      console.log('   GET  /saml/status    - Auth status');
      console.log('');
      console.log('📊 API Endpoints:');
      console.log('   POST /api/worker/register');
      console.log('   POST /api/worker/login');
      console.log('   POST /api/establishment/register');
      console.log('   POST /api/establishment/login');
      console.log('   POST /api/department/login');
      console.log('   POST /api/attendance/checkinorout');
      console.log('   GET  /api/location/states');
      console.log('   GET  /api/establishmentcategory/details');
      console.log('   ... and more');
      console.log('');

      // Validate SAML configuration
      const samlValidation = validateSamlConfig();
      if (!samlValidation.valid) {
        console.log('⚠️  SAML Configuration Warnings:');
        samlValidation.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
        console.log('   Please configure SAML settings in .env file');
        console.log('');
      } else {
        console.log('✅ SAML configuration validated');
        console.log('');
      }
      console.log('✨ Server is ready to accept connections');
      console.log('============================================');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

// Start the server
startServer();

export default app;

