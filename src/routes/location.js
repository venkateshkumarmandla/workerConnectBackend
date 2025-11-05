import express from 'express';
import { 
  getStates,
  getDistricts,
  getCities,
  getVillages,
  getEstablishmentCategories,
  getWorkNaturesByCategory
} from '../controllers/locationController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All location/master data endpoints are public
router.get('/states', asyncHandler(getStates));
router.get('/districts', asyncHandler(getDistricts));
router.get('/cities', asyncHandler(getCities));
router.get('/villages', asyncHandler(getVillages));

// Establishment category and work nature
router.get('/establishmentcategory/details', asyncHandler(getEstablishmentCategories));
router.get('/establishmentworknature/details', asyncHandler(getWorkNaturesByCategory));

export default router;

