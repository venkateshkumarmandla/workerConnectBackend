import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword, generateToken } from '../middleware/auth.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';
import {
  validateEmail,
  validateMobileNumber,
  validateAadhaar,
  validatePassword,
  validateRequiredFields
} from '../utils/validation.js';
import { recordLoginAttendance } from '../utils/attendanceHelper.js';

/**
 * Register new worker
 * POST /api/worker/register
 */
export const registerWorker = async (req, res, next) => {
  try {
    const workerData = req.body;

    // Validate required fields
    const requiredFields = [
      'aadhaarNumber', 'firstName', 'lastName', 'gender',
      'dateOfBirth', 'mobileNumber', 'password'
    ];
    const missingFields = validateRequiredFields(workerData, requiredFields);

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

    // Validate Aadhaar
    if (!validateAadhaar(workerData.aadhaarNumber)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid Aadhaar number. Must be 12 digits.',
          'aadhaarNumber'
        )
      );
    }

    // Validate mobile number
    if (!validateMobileNumber(workerData.mobileNumber)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid mobile number',
          'mobileNumber'
        )
      );
    }

    // Validate password
    if (!validatePassword(workerData.password)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Password must be at least 8 characters',
          'password'
        )
      );
    }

    // Validate email if provided
    if (workerData.emailId && !validateEmail(workerData.emailId)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid email address',
          'emailId'
        )
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(workerData.password);

    // Prepare worker data for insertion
    const insertData = {
      aadhaar_number: workerData.aadhaarNumber,
      e_card_id: workerData.eCardId || null,
      e_sharm_id: workerData.eSharmId || null,
      bo_cw_id: workerData.boCWId || null,
      access_card_id: workerData.accessCardId || null,
      first_name: workerData.firstName,
      middle_name: workerData.middleName || null,
      last_name: workerData.lastName,
      gender: workerData.gender,
      marital_status: workerData.maritalStatus || null,
      date_of_birth: workerData.dateOfBirth,
      age: workerData.age || null,
      relative_name: workerData.relativeName || null,
      caste: workerData.caste || null,
      sub_caste: workerData.subCaste || null,
      mobile_number: parseInt(workerData.mobileNumber),
      email_id: workerData.emailId || null,
      password: hashedPassword,

      // Permanent Address
      per_door_number: workerData.perDoorNumber || null,
      per_street: workerData.perStreet || null,
      per_state_id: workerData.perStateId || null,
      per_state_code: workerData.perStateCode || null,
      per_district_id: workerData.perDistrictId || null,
      per_district_code: workerData.perDistrictCode || null,
      per_city_id: workerData.perCityId || null,
      per_city_code: workerData.perCityCode || null,
      per_village_or_area_id: workerData.perVillageOrAreaId || null,
      per_pincode: workerData.perPincode || null,

      // Present Address
      is_same_as_per_addr: workerData.isSameAsPerAddr || false,
      pre_door_number: workerData.preDoorNumber || null,
      pre_street: workerData.preStreet || null,
      pre_state_id: workerData.preStateId || null,
      pre_state_code: workerData.preStateCode || null,
      pre_district_id: workerData.preDistrictId || null,
      pre_district_code: workerData.preDistrictCode || null,
      pre_city_id: workerData.preCityId || null,
      pre_city_code: workerData.preCityCode || null,
      pre_village_or_area_id: workerData.preVillageOrAreaId || null,
      pre_pincode: workerData.prePincode || null,

      // Membership
      is_nres_member: workerData.isNRESMember || 'N',
      is_trade_union: workerData.isTradeUnion || 'N',
      trade_union_number: workerData.tradeUnionNumber || null,

      status: 'active'
    };

    // Insert worker
    const { data: worker, error: workerError } = await supabase
      .from('worker')
      .insert(insertData)
      .select()
      .single();

    if (workerError) {
      console.error('Worker registration error:', workerError);

      if (workerError.code === '23505') {
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.DUPLICATE_ENTRY,
            'Worker with this Aadhaar or mobile number already exists',
            'aadhaarNumber'
          )
        );
      }

      throw workerError;
    }

    // Insert dependents if provided
    if (workerData.workerDependents && workerData.workerDependents.length > 0) {
      const dependents = workerData.workerDependents.map(dep => ({
        worker_id: worker.worker_id,
        dependent_name: dep.dependentName,
        date_of_birth: dep.dateOfBirth,
        relationship: dep.relationship,
        is_nominee_selected: dep.isNomineeSelected || false,
        percentage_of_benefits: dep.percentageOfBenifits || 0
      }));

      await supabase
        .from('worker_dependents')
        .insert(dependents);
    }

    // Remove password from response
    delete worker.password;

    res.status(201).json(successResponse({
      message: 'Worker registered successfully',
      workerId: worker.worker_id,
      worker: worker
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Worker login
 * POST /api/worker/login
 */
export const loginWorker = async (req, res, next) => {
  try {
    const { mobileNumber, password } = req.body;

    // Validate required fields
    if (!mobileNumber || !password) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Mobile number and password are required',
          'credentials'
        )
      );
    }

    // Find worker by mobile number
    const { data: worker, error } = await supabase
      .from('worker')
      .select('*')
      .eq('mobile_number', parseInt(mobileNumber))
      .single();

    if (error || !worker) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'Invalid mobile number or password',
          'credentials'
        )
      );
    }

    // Check if worker is active
    if (worker.status !== 'active') {
      return res.status(403).json(
        errorResponse(
          ERROR_CODES.AUTHORIZATION_ERROR,
          'Your account is not active. Please contact administrator.',
          'status'
        )
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, worker.password);
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
      .from('worker')
      .update({ last_logged_in: new Date().toISOString() })
      .eq('worker_id', worker.worker_id);

    // Get current establishment if worker is assigned
    const { data: establishment } = await supabase
      .from('establishment_worker')
      .select('establishment_id, work_location, establishment(establishment_name)')
      .eq('worker_id', worker.worker_id)
      .eq('status', 'active')
      .single();

    // Automatically record attendance login
    let attendanceMsg = null;
    try {
      const attendanceResult = await recordLoginAttendance(worker.worker_id);
      attendanceMsg = attendanceResult.message;
    } catch (err) {
      console.error('Failed to record login attendance:', err);
    }

    // Generate JWT token
    const token = generateToken({
      id: worker.worker_id,
      type: 'worker',
      mobileNumber: worker.mobile_number
    });

    // Prepare response data
    const responseData = {
      id: worker.worker_id,
      type: 'worker',
      firstName: worker.first_name,
      middleName: worker.middle_name,
      lastName: worker.last_name,
      fullName: worker.full_name,
      mobileNumber: worker.mobile_number,
      emailId: worker.email_id,
      lastLoggedIn: worker.last_logged_in,
      establishmentId: establishment?.establishment_id || null,
      estmtWorkerId: establishment?.estmt_worker_id || null,
      establishmentName: establishment?.establishment?.establishment_name || null,
      workLocation: establishment?.work_location || null,
      status: worker.status,
      token: token,
      attendanceMessage: attendanceMsg
    };

    res.json(successResponse(responseData));

  } catch (error) {
    next(error);
  }
};

/**
 * Get consolidated worker dashboard details
 * GET /api/worker/details
 */
export const getWorkerDashboardDetails = async (req, res, next) => {
  try {
    const workerId = req.user.workerId || req.user.id;
    console.log(`📊 [Dashboard] Fetching details for worker: ${workerId}`);

    // 1. Get worker profile
    const { data: worker, error: workerError } = await supabase
      .from('worker')
      .select('worker_id, full_name, first_name, last_name, access_card_id, mobile_number')
      .eq('worker_id', workerId)
      .single();

    if (workerError) throw workerError;

    // 2. Get active establishment assignment
    const { data: assignment, error: assignError } = await supabase
      .from('establishment_worker')
      .select(`
        *,
        establishment:establishment_id (establishment_name, establishment_id)
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .maybeSingle();

    if (assignError) throw assignError;

    // 3. Get latest attendance status
    const today = new Date().toISOString().split('T')[0];
    const { data: latestAttendance, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .gte('check_in_date_time', `${today}T00:00:00`)
      .order('check_in_date_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attError) throw attError;

    // 4. Calculate monthly stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthRecords, error: statsError } = await supabase
      .from('attendance')
      .select('status, check_out_date_time')
      .eq('worker_id', workerId)
      .gte('check_in_date_time', startOfMonth.toISOString());

    if (statsError) throw statsError;

    const stats = {
      present: monthRecords.filter(r => r.status === 'o' || r.check_out_date_time).length,
      incomplete: monthRecords.filter(r => r.status === 'i' && !r.check_out_date_time).length,
      absent: 0 // Mock for now, would need shift logic
    };

    const response = {
      worker: {
        id: worker.worker_id,
        fullName: worker.full_name || `${worker.first_name} ${worker.last_name}`,
        accessCardId: worker.access_card_id || 'N/A'
      },
      establishment: assignment ? {
        id: assignment.establishment_id,
        estmtWorkerId: assignment.estmt_worker_id,
        name: assignment.establishment.establishment_name,
        workLocation: assignment.work_location || 'Assigned Location'
      } : null,
      attendance: {
        status: latestAttendance
          ? (latestAttendance.check_out_date_time ? 'checked-out' : 'checked-in')
          : 'none',
        lastTime: latestAttendance
          ? (latestAttendance.check_out_date_time || latestAttendance.check_in_date_time)
          : null,
        currentAttendanceId: latestAttendance?.attendance_id || null,
        lastCheckIn: latestAttendance?.check_in_date_time || null,
        lastCheckOut: latestAttendance?.check_out_date_time || null,
      },
      stats: stats
    };

    res.json(successResponse(response));

  } catch (error) {
    console.error('❌ [Dashboard] Error:', error);
    next(error);
  }
};

/**
 * Get worker profile
 * GET /api/worker/profile/:workerId
 */
export const getWorkerProfile = async (req, res, next) => {
  try {
    const { workerId } = req.params;

    const { data: worker, error } = await supabase
      .from('worker')
      .select(`
        *,
        worker_dependents(*)
      `)
      .eq('worker_id', workerId)
      .single();

    if (error || !worker) {
      return res.status(404).json(
        errorResponse(
          ERROR_CODES.NOT_FOUND,
          'Worker not found',
          'workerId'
        )
      );
    }

    // Remove password
    delete worker.password;

    res.json(successResponse(worker));

  } catch (error) {
    next(error);
  }
};

