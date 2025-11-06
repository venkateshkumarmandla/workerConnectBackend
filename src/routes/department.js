import express from 'express';
import { 
   registerDepartment,
  loginDepartment,
  getDepartmentCardDetails,
  getAllEstablishments,
  getAllWorkers,
  getComplianceRecords,
  getApplicationsForReview,
  getDocumentsForVerification,
  getActiveLocations
} from '../controllers/departmentController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Public routes

router.post('/login', asyncHandler(loginDepartment));
router.post('/register', asyncHandler(registerDepartment));
// Protected routes - Department only
router.get('/dashboard/carddetails', asyncHandler(getDepartmentCardDetails));
router.get('/establishments', authenticateToken, authorizeRole('department'), asyncHandler(getAllEstablishments));
router.get('/workers', authenticateToken, authorizeRole('department'), asyncHandler(getAllWorkers));
router.get('/compliance', asyncHandler(getComplianceRecords));
router.get('/applications', asyncHandler(getApplicationsForReview));
router.get('/documents', asyncHandler(getDocumentsForVerification));
router.get('/locations', asyncHandler(getActiveLocations));

export default router;

