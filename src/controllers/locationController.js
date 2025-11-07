// import { supabase } from '../config/supabase.js';
// import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

// /**
//  * Get all states
//  * GET /api/location/states
//  */
// export const getStates = async (req, res, next) => {
//   try {
//     const { data: states, error } = await supabase
//       .from('state')
//       .select('*')
//       .order('state_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedStates = states?.map(s => ({
//       id: s.state_id,
//       value: s.state_id.toString(),
//       label: s.state_name,
//       code: s.state_code,
//       name: s.state_name
//     })) || [];

//     res.json(successResponse(formattedStates));

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get districts by state
//  * GET /api/location/districts?stateId={id}
//  */
// export const getDistricts = async (req, res, next) => {
//   try {
//     const { stateId } = req.query;

//     if (!stateId) {
//       return res.status(400).json(
//         errorResponse(
//           ERROR_CODES.VALIDATION_ERROR,
//           'stateId is required',
//           'stateId'
//         )
//       );
//     }

//     const { data: districts, error } = await supabase
//       .from('district')
//       .select('*')
//       .eq('state_id', stateId)
//       .order('district_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedDistricts = districts?.map(d => ({
//       id: d.district_id,
//       value: d.district_id.toString(),
//       label: d.district_name,
//       code: d.district_code,
//       name: d.district_name
//     })) || [];

//     res.json(successResponse(formattedDistricts));

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get cities/mandals by district
//  * GET /api/location/cities?districtId={id}
//  */
// export const getCities = async (req, res, next) => {
//   try {
//     const { districtId } = req.query;

//     if (!districtId) {
//       return res.status(400).json(
//         errorResponse(
//           ERROR_CODES.VALIDATION_ERROR,
//           'districtId is required',
//           'districtId'
//         )
//       );
//     }

//     const { data: cities, error } = await supabase
//       .from('city_mandal')
//       .select('*')
//       .eq('district_id', districtId)
//       .order('city_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedCities = cities?.map(c => ({
//       id: c.city_id,
//       value: c.city_id.toString(),
//       label: c.city_name,
//       code: c.city_code,
//       name: c.city_name
//     })) || [];

//     res.json(successResponse(formattedCities));

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get villages/areas by city
//  * GET /api/location/villages?cityId={id}
//  */
// export const getVillages = async (req, res, next) => {
//   try {
//     const { cityId } = req.query;

//     if (!cityId) {
//       return res.status(400).json(
//         errorResponse(
//           ERROR_CODES.VALIDATION_ERROR,
//           'cityId is required',
//           'cityId'
//         )
//       );
//     }

//     const { data: villages, error } = await supabase
//       .from('village_area')
//       .select('*')
//       .eq('city_id', cityId)
//       .order('village_or_area_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedVillages = villages?.map(v => ({
//       id: v.village_or_area_id,
//       value: v.village_or_area_id.toString(),
//       label: v.village_or_area_name,
//       code: v.village_or_area_code,
//       name: v.village_or_area_name
//     })) || [];

//     res.json(successResponse(formattedVillages));

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get all establishment categories
//  * GET /api/establishmentcategory/details
//  */
// export const getEstablishmentCategories = async (req, res, next) => {
//   try {
//     const { data: categories, error } = await supabase
//       .from('establishment_category')
//       .select('*')
//       .order('category_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedCategories = categories?.map(c => ({
//       categoryId: c.category_id,
//       categoryName: c.category_name,
//       description: c.description,
//       value: c.category_id.toString(),
//       label: c.category_name
//     })) || [];

//     res.json(successResponse(formattedCategories));

//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get work natures by category
//  * GET /api/establishmentworknature/details?categoryId={id}
//  */
// export const getWorkNaturesByCategory = async (req, res, next) => {
//   try {
//     const { categoryId } = req.query;

//     if (!categoryId) {
//       return res.status(400).json(
//         errorResponse(
//           ERROR_CODES.VALIDATION_ERROR,
//           'categoryId is required',
//           'categoryId'
//         )
//       );
//     }

//     const { data: workNatures, error } = await supabase
//       .from('establishment_work_nature')
//       .select('*')
//       .eq('category_id', categoryId)
//       .order('work_nature_name');

//     if (error) throw error;

//     // Format for frontend
//     const formattedWorkNatures = workNatures?.map(w => ({
//       workNatureId: w.work_nature_id,
//       workNatureName: w.work_nature_name,
//       description: w.description,
//       value: w.work_nature_id.toString(),
//       label: w.work_nature_name
//     })) || [];

//     res.json(successResponse(formattedWorkNatures));

//   } catch (error) {
//     next(error);
//   }
// };

import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

/**
 * Get districts by state
 * GET /api/location/districtsdetailsbystateid?stateId={id}
 */
export const getDistrictsByStateId = async (req, res, next) => {
  try {
    const { stateId } = req.query;

    if (!stateId) {
      return res.status(400).json(
        errorResponse(ERROR_CODES.VALIDATION_ERROR, 'stateId is required', 'stateId')
      );
    }

    const { data: districts, error } = await supabase
      .from('district')
      .select('*')
      .eq('state_id', stateId)
      .order('district_name');

    if (error) throw error;

    const formatted = districts?.map(d => ({
      id: d.district_id,
      value: d.district_id.toString(),
      label: d.district_name,
      code: d.district_code,
      name: d.district_name
    })) || [];

    res.json(successResponse(formatted));
  } catch (error) {
    next(error);
  }
};

/**
 * Get cities by districtId
 * POST /api/location/citiesdetailsbydistrictid?districtId={id}
 */
export const getCitiesByDistrictId = async (req, res, next) => {
  try {
    const { districtId } = req.query;

    if (!districtId) {
      return res.status(400).json(
        errorResponse(ERROR_CODES.VALIDATION_ERROR, 'districtId is required', 'districtId')
      );
    }

    const { data: cities, error } = await supabase
      .from('city_mandal')
      .select('*')
      .eq('district_id', districtId)
      .order('city_name');

    if (error) throw error;

    const formatted = cities?.map(c => ({
      id: c.city_id,
      value: c.city_id.toString(),
      label: c.city_name,
      code: c.city_code,
      name: c.city_name
    })) || [];

    res.json(successResponse(formatted));
  } catch (error) {
    next(error);
  }
};

/**
 * Get villages by cityId
 * POST /api/location/villagesareasdetailsbycityid?cityId={id}
 */
export const getVillagesByCityId = async (req, res, next) => {
  try {
    const { cityId } = req.query;

    if (!cityId) {
      return res.status(400).json(
        errorResponse(ERROR_CODES.VALIDATION_ERROR, 'cityId is required', 'cityId')
      );
    }

    const { data: villages, error } = await supabase
      .from('village_area')
      .select('*')
      .eq('city_id', cityId)
      .order('village_or_area_name');

    if (error) throw error;

    const formatted = villages?.map(v => ({
      id: v.village_or_area_id,
      value: v.village_or_area_id.toString(),
      label: v.village_or_area_name,
      code: v.village_or_area_code,
      name: v.village_or_area_name
    })) || [];

    res.json(successResponse(formatted));
  } catch (error) {
    next(error);
  }
};
