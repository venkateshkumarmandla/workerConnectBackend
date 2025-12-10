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

// Import routes
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

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
// Allow all origins when FRONTEND_URL is '*' (for mobile app access)
const corsOptions = FRONTEND_URL === '*' 
  ? {
      origin: true, // Allow all origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174',
        'capacitor://localhost',
  'http://localhost',            
  'http://localhost:5173',
'https://dulcet-cobbler-4df9df.netlify.app'
     ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// SESSION CONFIGURATION
// ============================================

/**
 * Session middleware for SAML authentication
 * 
 * Sessions are required for:
 * - Storing SAML user information
 * - Tracking pending card scans
 * - Maintaining authentication state
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  },
  name: 'saml.sid' // Session cookie name
}));

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
app.use('/api/worker', workerRoutes);
app.use('/api/establishment', establishmentRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Location and master data routes (mapped to match existing API structure)
app.use('/api/location', locationRoutes);
app.use('/api', locationRoutes); // Also mount at /api root for establishmentcategory/details paths

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

