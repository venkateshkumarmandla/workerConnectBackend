// import express from 'express';
// import { 
//   getStates,
//   getDistricts,
//   getCities,
//   getVillages,
//   getEstablishmentCategories,
//   getWorkNaturesByCategory
// } from '../controllers/locationController.js';
// import { asyncHandler } from '../middleware/errorHandler.js';

// const router = express.Router();

// // All location/master data endpoints are public
// router.get('/states', asyncHandler(getStates));
// router.get('/districts', asyncHandler(getDistricts));
// router.get('/cities', asyncHandler(getCities));
// router.get('/villages', asyncHandler(getVillages));

// // Establishment category and work nature
// router.get('/establishmentcategory/details', asyncHandler(getEstablishmentCategories));
// router.get('/establishmentworknature/details', asyncHandler(getWorkNaturesByCategory));

// export default router;




// import express from 'express';
// const router = express.Router();

// // ✅ GET /api/location/districtsdetailsbystateid?stateId=1
// router.get('/districtsdetailsbystateid', async (req, res) => {
//   try {
//     const { stateId } = req.query;

//     const result = await api(
//       `/districts/districtsdetailsbystateid?stateId=${stateId}`,
//       'GET'
//     );

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // ✅ POST /api/location/citiesdetailsbydistrictid?districtId=1
// router.post('/citiesdetailsbydistrictid', async (req, res) => {
//   try {
//     const { districtId } = req.query;

//     const result = await api(
//       `/cities/citiesdetailsbydistrictid?districtId=${districtId}`,
//       'POST'
//     );

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // ✅ POST /api/location/villagesareasdetailsbycityid?cityId=1
// router.post('/villagesareasdetailsbycityid', async (req, res) => {
//   try {
//     const { cityId } = req.query;

//     const result = await api(
//       `/villagesareas/villagesareasdetailsbycityid?cityId=${cityId}`,
//       'POST'
//     );

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;


import express from 'express';
import {
  getDistrictsByStateId,
  getCitiesByDistrictId,
  getVillagesByCityId
} from '../controllers/locationController.js';

const router = express.Router();

// ✅ GET /api/location/districtsdetailsbystateid?stateId=1
router.get('/districtsdetailsbystateid', getDistrictsByStateId);

// ✅ POST /api/location/citiesdetailsbydistrictid?districtId=1
router.post('/citiesdetailsbydistrictid', getCitiesByDistrictId);

// ✅ POST /api/location/villagesareasdetailsbycityid?cityId=1
router.post('/villagesareasdetailsbycityid', getVillagesByCityId);

export default router;
