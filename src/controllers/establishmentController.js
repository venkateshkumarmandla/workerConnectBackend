import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword, generateToken } from '../middleware/auth.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';
import {
  validateEmail,
  validateMobileNumber,
  validateRequiredFields
} from '../utils/validation.js';

/**
 * Register new establishment
 * POST /api/establishment/register
 */
export const registerEstablishment = async (req, res, next) => {
  try {
    const estData = req.body;

    // Validate required fields
    const requiredFields = [
      'establishmentName', 'contactPerson', 'mobileNumber',
      'emailId', 'categoryId', 'workNatureId', 'commencementDate'
    ];
    const missingFields = validateRequiredFields(estData, requiredFields);

    if (missingFields.length > 0) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          `Missing required fields: ${missingFields.join(', ')}`,
          'validation',
          missingFields
        )
      );
    }

    // Validate mobile number
    if (!validateMobileNumber(estData.mobileNumber)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid mobile number',
          'mobileNumber'
        )
      );
    }

    // Validate email
    if (!validateEmail(estData.emailId)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid email address',
          'emailId'
        )
      );
    }

    // Hash password (default or provided)
    const password = estData.password || 'Password@123';
    const hashedPassword = await hashPassword(password);

    // Prepare establishment data
    const insertData = {
      establishment_name: estData.establishmentName,
      contact_person: estData.contactPerson,
      mobile_number: parseInt(estData.mobileNumber),
      email_id: estData.emailId,
      password: hashedPassword,

      // Address
      door_number: estData.doorNumber || null,
      street: estData.street || null,
      state_id: estData.stateId || 1,
      state_code: estData.stateCode || 'AP',
      district_id: estData.districtId,
      district_code: estData.districtCode || null,
      district_name: estData.districtName || null,
      city_id: estData.cityId,
      city_code: estData.cityCode || null,
      city_name: estData.cityName || null,
      village_or_area_id: estData.villageOrAreaId || null,
      village_or_area_code: estData.villageOrAreaCode || null,
      village_or_area_name: estData.villageOrAreaName || null,
      pincode: parseInt(estData.pincode),

      // Business Details
      is_plan_approval_id: estData.isPlanApprovalId || 'N',
      plan_approval_id: estData.planApprovalId || null,
      category_id: parseInt(estData.categoryId),
      work_nature_id: parseInt(estData.workNatureId),

      // Project Details
      commencement_date: estData.commencementDate,
      completion_date: estData.completionDate || null,
      construction_estimated_cost: parseFloat(estData.constructionEstimatedCost || 0),
      construction_area: parseFloat(estData.constructionArea || 0),
      built_up_area: parseFloat(estData.builtUpArea || 0),
      basic_estimated_cost: parseFloat(estData.basicEstimatedCost || 0),
      no_of_male_workers: parseInt(estData.noOfMaleWorkers || 0),
      no_of_female_workers: parseInt(estData.noOfFemaleWorkers || 0),

      // Terms
      is_accepted_terms_and_conditions: estData.isAcceptedTermsAndConditions || 'Y',

      status: 'pending' // Admin approval required
    };

    // Insert establishment
    const { data: establishment, error: estError } = await supabase
      .from('establishment')
      .insert(insertData)
      .select()
      .single();

    if (estError) {
      console.error('Establishment registration error:', estError);

      if (estError.code === '23505') {
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.DUPLICATE_ENTRY,
            'Establishment with this mobile number or email already exists',
            'mobileNumber'
          )
        );
      }

      throw estError;
    }

    // Remove password from response
    delete establishment.password;

    res.status(201).json(successResponse({
      message: 'Establishment registered successfully. Awaiting admin approval.',
      establishmentId: establishment.establishment_id,
      establishment: establishment
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Establishment login
 * POST /api/establishment/login
 */
export const loginEstablishment = async (req, res, next) => {
  try {
    const { mobileNumber, password } = req.body;

    // Validate
    if (!mobileNumber || !password) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Mobile number and password are required',
          'credentials'
        )
      );
    }

    // Find establishment
    const { data: establishment, error } = await supabase
      .from('establishment')
      .select('*')
      .eq('mobile_number', parseInt(mobileNumber))
      .single();

    if (error || !establishment) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'Invalid mobile number or password',
          'credentials'
        )
      );
    }

    // Check status
    if (establishment.status === 'suspended') {
      return res.status(403).json(
        errorResponse(
          ERROR_CODES.AUTHORIZATION_ERROR,
          'Your account is suspended. Please contact administrator.',
          'status'
        )
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, establishment.password);
    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'Invalid mobile number or password',
          'credentials'
        )
      );
    }

    // Update last logged in
    await supabase
      .from('establishment')
      .update({ last_logged_in: new Date().toISOString() })
      .eq('establishment_id', establishment.establishment_id);

    // Generate token
    const token = generateToken({
      id: establishment.establishment_id,
      type: 'establishment',
      mobileNumber: establishment.mobile_number
    });

    // Create Session for Unified Access
    req.session.user = {
      role: 'establishment',
      establishmentId: establishment.establishment_id,
      name: establishment.establishment_name,
      email: establishment.email_id,
      contactPerson: establishment.contact_person,
      mobileNumber: establishment.mobile_number,
      authenticatedAt: new Date().toISOString()
    };

    // Response data
    const responseData = {
      establishmentId: establishment.establishment_id,
      establishmentName: establishment.establishment_name,
      mobileNumber: establishment.mobile_number,
      emailId: establishment.email_id,
      contactPerson: establishment.contact_person,
      status: establishment.status,
      lastLoggedIn: establishment.last_logged_in,
      type: 'establishment',
      token: token
    };

    res.json(successResponse(responseData));

  } catch (error) {
    next(error);
  }
};

/**
 * Get establishment dashboard card details
 * GET /api/establishment/dashboard/carddetails?establishmentId={id}
 */
export const getEstablishmentCardDetails = async (req, res, next) => {
  try {
    const { establishmentId } = req.query;

    if (!establishmentId) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'establishmentId is required',
          'establishmentId'
        )
      );
    }

    // Get total workers
    const { count: totalWorkers } = await supabase
      .from('establishment_worker')
      .select('*', { count: 'exact', head: true })
      .eq('establishment_id', establishmentId)
      .eq('status', 'active');

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];

    const { count: presentToday } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('establishment_id', establishmentId)
      .gte('check_in_date_time', `${today}T00:00:00`)
      .eq('status', 'i');

    const { count: absentToday } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('establishment_id', establishmentId)
      .gte('check_in_date_time', `${today}T00:00:00`)
      .eq('status', 'o');

    // Get currently logged in (checked in but not checked out)
    const { count: loggedInWorkers } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('establishment_id', establishmentId)
      .eq('status', 'i')
      .is('check_out_date_time', null);

    const cardDetails = {
      totalWorkers: totalWorkers || 0,
      presentToday: presentToday || 0,
      absentToday: (totalWorkers || 0) - (presentToday || 0),
      loggedInWorkers: loggedInWorkers || 0,
      loggedOutWorkers: (presentToday || 0) - (loggedInWorkers || 0)
    };

    res.json(successResponse(cardDetails));

  } catch (error) {
    next(error);
  }
};

/**
 * Get workers by establishment
 * GET /api/establishment/workerdetails?establishmentId={id}
 */
export const getWorkerDetailsByEstablishment = async (req, res, next) => {
  try {
    // Determine establishmentId:
    // 1. From query (admin/department override)
    // 2. From session (establishment user)
    // 3. Fallback to query
    let targetEstablishmentId = establishmentId;

    if (req.session.user && req.session.user.role === 'establishment') {
      targetEstablishmentId = req.session.user.establishmentId;
    } else if (!targetEstablishmentId) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'establishmentId is required',
          'establishmentId'
        )
      );
    }

    const { data: workers, error } = await supabase
      .from('establishment_worker')
      .select(`
        *,
        worker:worker_id (
          worker_id,
          first_name,
          middle_name,
          last_name,
          full_name,
          aadhaar_number,
          mobile_number,
          email_id,
          status
        )
      `)
      .eq('establishment_id', targetEstablishmentId);

    if (error) throw error;

    res.json(successResponse(workers || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Add worker to establishment
 * POST /api/establishment/persistworkerdetailsbyestablishment
 */
export const persistWorkerDetails = async (req, res, next) => {
  try {
    const {
      estmtWorkerId,
      establishmentId,
      workerId,
      aadhaarCardNumber,
      workingFromDate,
      workingToDate,
      status
    } = req.body;

    // Validate required fields
    if (!establishmentId || !workerId || !aadhaarCardNumber || !workingFromDate) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'establishmentId, workerId, aadhaarCardNumber, and workingFromDate are required',
          'validation'
        )
      );
    }

    let result;

    if (estmtWorkerId) {
      // Update existing
      const { data, error } = await supabase
        .from('establishment_worker')
        .update({
          aadhaar_card_number: aadhaarCardNumber,
          working_from_date: workingFromDate,
          working_to_date: workingToDate || null,
          status: status || 'active'
        })
        .eq('estmt_worker_id', estmtWorkerId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('establishment_worker')
        .insert({
          establishment_id: establishmentId,
          worker_id: workerId,
          aadhaar_card_number: aadhaarCardNumber,
          working_from_date: workingFromDate,
          working_to_date: workingToDate || null,
          status: status || 'active'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json(
            errorResponse(
              ERROR_CODES.DUPLICATE_ENTRY,
              'Worker is already assigned to this establishment',
              'workerId'
            )
          );
        }
        throw error;
      }
      result = data;
    }

    res.json(successResponse({
      message: 'Worker details saved successfully',
      data: result
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Get available workers (registered workers not yet assigned)
 * GET /api/establishment/availableaadhaarcarddetails
 */
export const getAvailableAadhaarCardDetails = async (req, res, next) => {
  try {
    // Get all workers
    const { data: allWorkers, error: workersError } = await supabase
      .from('worker')
      .select('worker_id, aadhaar_number, full_name, first_name, last_name')
      .eq('status', 'active');

    if (workersError) throw workersError;

    // Get workers already assigned
    const { data: assignedWorkers, error: assignedError } = await supabase
      .from('establishment_worker')
      .select('worker_id')
      .eq('status', 'active');

    if (assignedError) throw assignedError;

    // Filter out assigned workers
    const assignedWorkerIds = new Set(assignedWorkers?.map(aw => aw.worker_id) || []);
    const availableWorkers = allWorkers?.filter(w => !assignedWorkerIds.has(w.worker_id)) || [];

    // Format response
    const formattedWorkers = availableWorkers.map(w => ({
      workerId: w.worker_id,
      aadhaarCardNumber: w.aadhaar_number,
      workerName: w.full_name
    }));

    res.json(successResponse(formattedWorkers));

  } catch (error) {
    next(error);
  }
};

