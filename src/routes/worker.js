import express from 'express';
import { registerWorker, loginWorker, getWorkerProfile } from '../controllers/workerController.js';
import { authenticateToken, verifyWorkerOwnership } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Public routes
router.post('/register', asyncHandler(registerWorker));
router.post('/login', asyncHandler(loginWorker));

// Protected routes
router.get('/profile/:workerId', authenticateToken, asyncHandler(getWorkerProfile));

export default router;

