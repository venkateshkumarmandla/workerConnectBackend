import express from 'express';
import {
  checkInOrOut,
  getWorkerAttendance,
  getEstablishmentAttendance,
  getCurrentlyCheckedInWorkers,
  getTodayAttendance,
  getCurrentCount
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Check-in/out endpoint
router.post('/checkinorout', asyncHandler(checkInOrOut));

// Protected routes
router.get('/worker/:workerId', authenticateToken, asyncHandler(getWorkerAttendance));
router.get('/establishment/:establishmentId', authenticateToken, asyncHandler(getEstablishmentAttendance));
router.get('/current', authenticateToken, asyncHandler(getCurrentlyCheckedInWorkers));
router.get('/current/count', authenticateToken, asyncHandler(getCurrentCount));
router.get('/today', authenticateToken, asyncHandler(getTodayAttendance));

export default router;

