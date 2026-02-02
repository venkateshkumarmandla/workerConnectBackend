import express from 'express';
import {
  checkInOrOut,
  getWorkerAttendance,
  getEstablishmentAttendance,
  getCurrentlyCheckedInWorkers,
  getTodayAttendance,
  getCurrentCount,
  getDailyStatus,
  getMonthlySummary,
  getEstablishmentMonthlyReport,
  getDepartmentAttendanceData,
  getWorkerMonthlySummaryWithCounts,
  getEstablishmentDepartmentStats,
  getDepartmentWorkersWithAttendance
} from '../controllers/attendanceController.js';
import { authenticateSession } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Base context is /api/attendance (from server.js mapping)

// Check-in/out endpoint
router.post('/checkinorout', authenticateSession, asyncHandler(checkInOrOut));

// Status and Summary routes (Worker)
router.get('/status/:workerId', authenticateSession, asyncHandler(getDailyStatus));
router.get('/summary/worker/:workerId', authenticateSession, asyncHandler(getMonthlySummary));

// Dashboard / Reporting routes (Establishment & Department)
router.get('/report/establishment/:establishmentId', authenticateSession, asyncHandler(getEstablishmentMonthlyReport));
router.get('/report/department/:departmentId', authenticateSession, asyncHandler(getDepartmentAttendanceData));

// Standard History routes
router.get('/worker/:workerId', authenticateSession, asyncHandler(getWorkerAttendance));
router.get('/establishment/:establishmentId', authenticateSession, asyncHandler(getEstablishmentAttendance));
router.get('/current', authenticateSession, asyncHandler(getCurrentlyCheckedInWorkers));
router.get('/current/count', authenticateSession, asyncHandler(getCurrentCount));
router.get('/today', authenticateSession, asyncHandler(getTodayAttendance));

// New enhanced attendance APIs
router.get('/worker/:workerId/monthly-summary', authenticateSession, asyncHandler(getWorkerMonthlySummaryWithCounts));
router.get('/establishment/:establishmentId/department-stats', authenticateSession, asyncHandler(getEstablishmentDepartmentStats));
router.get('/department/:departmentName/workers', authenticateSession, asyncHandler(getDepartmentWorkersWithAttendance));

export default router;
