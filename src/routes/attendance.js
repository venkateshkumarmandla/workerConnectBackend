import express from 'express';
import {
  checkInOrOut,
  getWorkerAttendance,
  getEstablishmentAttendance,
  getCurrentlyCheckedInWorkers,
  getTodayAttendance,
  getCurrentCount
} from '../controllers/attendanceController.js';
import { authenticateToken, authenticateSession } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Check-in/out endpoint
// checkInOrOut might be called from card scan which handles auth differently or
// from frontend which needs session. For now, let's allow session auth.
router.post('/checkinorout', authenticateSession, asyncHandler(checkInOrOut));

// Protected routes
// Using authenticateSession instead of authenticateToken for SAML-based frontend
router.get('/worker/:workerId', authenticateSession, asyncHandler(getWorkerAttendance));
router.get('/establishment/:establishmentId', authenticateSession, asyncHandler(getEstablishmentAttendance));
router.get('/current', authenticateSession, asyncHandler(getCurrentlyCheckedInWorkers));
router.get('/current/count', authenticateSession, asyncHandler(getCurrentCount));
router.get('/today', authenticateSession, asyncHandler(getTodayAttendance));

export default router;
