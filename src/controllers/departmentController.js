import { supabase } from '../config/supabase.js';
import { comparePassword, generateToken } from '../middleware/auth.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

async function showTableColumns() {
  const { data, error } = await supabase
    .from('department_user')
    .select('*')
    .limit(1); // fetch just one row

  if (error) {
    console.error("Error fetching table data:", error);
  } else if (data && data.length > 0) {
    console.log("Keys found in department_user table:", Object.keys(data[0]));
  } else {
    console.log("No data found, but connection succeeded!");
  }
}

showTableColumns();
/**
 * Department user registration
 * POST /api/department/register
 */
export const registerDepartment = async (req, res, next) => {
  try {
    const { fullName, emailId, password, contactNumber, departmentRoleId } = req.body;

    // Validate input
    if (!fullName || !emailId || !password || !departmentRoleId) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Full name, email, password, and department role are required',
          'validation'
        )
      );
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('department_user')
      .select('email_id')
      .eq('email_id', emailId)
      .single();

    if (existingUser) {
      return res.status(409).json(
        errorResponse(
          ERROR_CODES.DUPLICATE_ENTRY,
          'User already registered with this email',
          'emailId'
        )
      );
    }

    // Hash password
    const { hashPassword } = await import('../middleware/auth.js');
    const hashedPassword = await hashPassword(password);

    // Insert new department user
    const { data: newUser, error } = await supabase
      .from('department_user')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email_id: emailId,
          password: hashedPassword,
          contact_number: contactNumber || null,
          department_role_id: departmentRoleId,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Generate token for immediate login
    const token = generateToken({
      id: newUser.department_user_id,
      type: 'department',
      roleId: newUser.department_role_id
    });

    const responseData = {
      departmentUserId: newUser.department_user_id,
      fullName: `${newUser.first_name} ${newUser.last_name || ''}`.trim(),
      emailId: newUser.email_id,
      contactNumber: newUser.contact_number,
      departmentRoleId: newUser.department_role_id,
      status: newUser.status,
      token
    };

    res.status(201).json(successResponse(responseData));

  } catch (error) {
    console.error('Registration Error:', error);
    next(error);
  }
};



/**
 * Department user login
 * POST /api/department/login
 */
export const loginDepartment = async (req, res, next) => {
  try {
    const { emailId, contactNumber, password } = req.body;

    // ✅ Validate
    if ((!emailId && !contactNumber) || !password) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Either emailId or contactNumber and password are required',
          'credentials'
        )
      );
    }

    // ✅ Build query condition
    let query = supabase
      .from('department_user')
      .select(`
        *,
        department_role:department_role_id (
          department_role_id,
          role_name,
          role_description
        )
      `)
      .limit(1); // Ensure single result

    if (emailId) {
      query = query.eq('email_id', emailId);
    } else if (contactNumber) {
      query = query.eq('contact_number', contactNumber);
    }

    const { data: deptUser, error } = await query.single();

    if (error || !deptUser) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'Invalid credentials (email/contact number or password)',
          'credentials'
        )
      );
    }

    // ✅ Check account status
    if (deptUser.status !== 'active') {
      return res.status(403).json(
        errorResponse(
          ERROR_CODES.AUTHORIZATION_ERROR,
          'Your account is not active. Please contact administrator.',
          'status'
        )
      );
    }

    // ✅ Verify password
    const isPasswordValid = await comparePassword(password, deptUser.password);
    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse(
          ERROR_CODES.AUTHENTICATION_ERROR,
          'Invalid credentials (email/contact number or password)',
          'credentials'
        )
      );
    }

    // ✅ Update last login timestamp
    await supabase
      .from('department_user')
      .update({ last_logged_in: new Date().toISOString() })
      .eq('department_user_id', deptUser.department_user_id);

    // ✅ Generate token
    const token = generateToken({
      id: deptUser.department_user_id,
      type: 'department',
      roleId: deptUser.department_role_id,
      roleName: deptUser.department_role.role_name
    });

    // ✅ Final response
    const responseData = {
      departmentRoleId: deptUser.department_role_id,
      roleName: deptUser.department_role.role_name,
      roleDescription: deptUser.department_role.role_description,
      departmentUserId: deptUser.department_user_id,
      emailId: deptUser.email_id,
      contactNumber: deptUser.contact_number,
      lastLoggedIn: deptUser.last_logged_in,
      token: token
    };

    return res.json(successResponse(responseData));
  } catch (error) {
    next(error);
  }
};


/**
 * Get department dashboard card details
 * GET /api/department/dashboard/carddetails
 */
export const getDepartmentCardDetails = async (req, res, next) => {
  try {
    // Total workers in system
    const { count: totalWorkers } = await supabase
      .from('worker')
      .select('*', { count: 'exact', head: true });

    // Today's date for attendance queries
    const today = new Date().toISOString().split('T')[0];

    // Present workers today
    const { count: presentWorkers } = await supabase
      .from('attendance')
      .select('worker_id', { count: 'exact', head: true })
      .gte('check_in_date_time', `${today}T00:00:00`)
      .eq('status', 'i');

    // Absent workers (total - present)
    const absentWorkers = (totalWorkers || 0) - (presentWorkers || 0);

    // Currently logged in workers (checked in but not checked out)
    const { count: loggedInWorkers } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'i')
      .is('check_out_date_time', null);

    // Logged out workers today
    const { count: loggedOutWorkers } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_date_time', `${today}T00:00:00`)
      .eq('status', 'o');

    // New workers in establishment_worker table (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: newEstablishmentWorkers } = await supabase
      .from('establishment_worker')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // New registered workers (last 7 days)
    const { count: newRegistrationWorkers } = await supabase
      .from('worker')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const cardDetails = {
      totalWorkers: totalWorkers || 0,
      presentWorkers: presentWorkers || 0,
      absentWorkers: absentWorkers || 0,
      loggedInWorkers: loggedInWorkers || 0,
      loggedOutWorkers: loggedOutWorkers || 0,
      newEstablishmentWorkers: newEstablishmentWorkers || 0,
      newRegistrationWorkers: newRegistrationWorkers || 0
    };

    res.json(successResponse(cardDetails));

  } catch (error) {
    next(error);
  }
};

/**
 * Get all establishments (Department view)
 * GET /api/department/establishments
 */
export const getAllEstablishments = async (req, res, next) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('establishment')
      .select(`
        *,
        establishment_category:category_id (category_name),
        establishment_work_nature:work_nature_id (work_nature_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: establishments, error } = await query;

    if (error) throw error;

    res.json(successResponse(establishments || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Get all workers (Department view)
 * GET /api/department/workers
 */
export const getAllWorkers = async (req, res, next) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('worker')
      .select('worker_id, full_name, aadhaar_number, mobile_number, email_id, status, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: workers, error} = await query;

    if (error) throw error;

    res.json(successResponse(workers || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Get compliance records
 * GET /api/department/compliance
 */
export const getComplianceRecords = async (req, res, next) => {
  try {
    // TODO: Implement when compliance tracking table is added to database
    // For now, return empty array to prevent frontend errors
    // Future: Add compliance_records table with inspection data
    res.json(successResponse([]));
  } catch (error) {
    next(error);
  }
};

/**
 * Get applications for review (pending workers and establishments)
 * GET /api/department/applications
 */
export const getApplicationsForReview = async (req, res, next) => {
  try {
    const { type, status, limit = 100, offset = 0 } = req.query;

    let applications = [];

    // Get pending workers
    if (!type || type === 'worker') {
      const { data: workers, error: workerError } = await supabase
        .from('worker')
        .select('worker_id, full_name, aadhaar_number, mobile_number, email_id, status, created_at')
        .eq('status', status || 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + Math.floor(limit / 2) - 1);

      if (!workerError && workers) {
        applications = applications.concat(
          workers.map(w => ({
            id: `W${w.worker_id}`,
            type: 'worker',
            applicantName: w.full_name,
            registrationId: `WK${w.worker_id}`,
            submissionDate: w.created_at,
            status: w.status === 'active' ? 'approved' : 'pending',
            priority: 'medium',
            contactInfo: {
              mobile: w.mobile_number?.toString(),
              email: w.email_id
            },
            documents: {
              total: 4,
              verified: w.status === 'active' ? 4 : 2,
              pending: w.status === 'active' ? 0 : 2,
              rejected: 0
            }
          }))
        );
      }
    }

    // Get pending establishments
    if (!type || type === 'establishment') {
      const { data: establishments, error: estError } = await supabase
        .from('establishment')
        .select(`
          establishment_id,
          establishment_name,
          contact_person,
          mobile_number,
          email_id,
          status,
          created_at,
          district:district_id (district_name),
          city:city_id (city_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + Math.floor(limit / 2) - 1);

      if (!estError && establishments) {
        applications = applications.concat(
          establishments.map(e => ({
            id: `E${e.establishment_id}`,
            type: 'establishment',
            applicantName: e.establishment_name,
            registrationId: `EST${e.establishment_id}`,
            submissionDate: e.created_at,
            status: e.status,
            priority: e.status === 'pending' ? 'high' : 'medium',
            contactInfo: {
              mobile: e.mobile_number?.toString(),
              email: e.email_id
            },
            location: {
              district: e.district?.district_name || '',
              mandal: e.city?.city_name || ''
            },
            documents: {
              total: 6,
              verified: e.status === 'active' ? 6 : 4,
              pending: e.status === 'pending' ? 2 : 0,
              rejected: 0
            }
          }))
        );
      }
    }

    // Sort by submission date (newest first)
    applications.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));

    res.json(successResponse(applications));

  } catch (error) {
    next(error);
  }
};

/**
 * Get documents for verification
 * GET /api/department/documents
 */
export const getDocumentsForVerification = async (req, res, next) => {
  try {
    // TODO: Implement when document management/storage is added
    // For now, return empty array to prevent frontend errors
    // Future: Add documents table or integrate with Supabase Storage
    res.json(successResponse([]));
  } catch (error) {
    next(error);
  }
};

/**
 * Get active locations (workers and establishments for map display)
 * GET /api/department/locations
 */
export const getActiveLocations = async (req, res, next) => {
  try {
    let locations = [];

    // Get currently checked-in workers with their locations
    const { data: checkedInWorkers, error: workerError } = await supabase
      .from('attendance')
      .select(`
        attendance_id,
        work_location,
        check_in_date_time,
        worker:worker_id (
          worker_id,
          full_name
        )
      `)
      .eq('status', 'i')
      .is('check_out_date_time', null)
      .limit(50);

    if (!workerError && checkedInWorkers) {
      // For workers, we don't have exact lat/long in current schema
      // Return placeholder data for now
      // TODO: Add latitude/longitude to attendance table or worker location tracking
      checkedInWorkers.forEach((attendance, index) => {
        if (attendance.worker) {
          locations.push({
            id: `worker-${attendance.worker.worker_id}`,
            name: attendance.worker.full_name,
            latitude: 17.3850 + (Math.random() - 0.5) * 0.1, // Placeholder around Hyderabad
            longitude: 78.4867 + (Math.random() - 0.5) * 0.1,
            type: 'worker',
            status: 'checked-in',
            lastUpdate: attendance.check_in_date_time,
            workLocation: attendance.work_location
          });
        }
      });
    }

    // Get active establishments (without exact location data for now)
    const { data: establishments, error: estError } = await supabase
      .from('establishment')
      .select('establishment_id, establishment_name, status')
      .eq('status', 'active')
      .limit(20);

    if (!estError && establishments) {
      // TODO: Add latitude/longitude to establishment table for accurate map display
      establishments.forEach((est, index) => {
        locations.push({
          id: `establishment-${est.establishment_id}`,
          name: est.establishment_name,
          latitude: 17.3800 + (Math.random() - 0.5) * 0.1, // Placeholder
          longitude: 78.4800 + (Math.random() - 0.5) * 0.1,
          type: 'establishment',
          status: 'online',
          lastUpdate: new Date().toISOString()
        });
      });
    }

    res.json(successResponse(locations));

  } catch (error) {
    next(error);
  }
};

