import express from 'express';
import {
  registerEstablishment,
  loginEstablishment,
  getEstablishmentCardDetails,
  getWorkerDetailsByEstablishment,
  persistWorkerDetails,
  getAvailableAadhaarCardDetails
} from '../controllers/establishmentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Public routes
router.post('/register', asyncHandler(registerEstablishment));
router.post('/login', asyncHandler(loginEstablishment));

// Protected routes
router.get('/dashboard/carddetails', asyncHandler(getEstablishmentCardDetails));
router.get('/workerdetails', asyncHandler(getWorkerDetailsByEstablishment));
router.get('/workers', asyncHandler(getWorkerDetailsByEstablishment)); // Alias for consistency
router.post('/persistworkerdetailsbyestablishment', authenticateToken, asyncHandler(persistWorkerDetails));
router.get('/availableaadhaarcarddetails', authenticateToken, asyncHandler(getAvailableAadhaarCardDetails));

export default router;

