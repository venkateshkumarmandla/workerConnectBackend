import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/supabase.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import workerRoutes from './routes/worker.js';
import establishmentRoutes from './routes/establishment.js';
import departmentRoutes from './routes/department.js';
import attendanceRoutes from './routes/attendance.js';
import locationRoutes from './routes/location.js';

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
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

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

