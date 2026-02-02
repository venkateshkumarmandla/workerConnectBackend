import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

/**
 * Worker check-in or check-out (Explicit via API)
 * POST /api/worker/checkinorout
 */
export const checkInOrOut = async (req, res, next) => {
  try {
    const {
      attendanceId,
      establishmentId,
      workerId,
      estmtWorkerId,
      workLocation,
      checkInDateTime,
      checkOutDateTime,
      status
    } = req.body;

    // Validate required fields
    if (!establishmentId || !workerId || !estmtWorkerId || !status) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'establishmentId, workerId, estmtWorkerId, and status are required',
          'validation'
        )
      );
    }

    let result;
    let message;

    if (status === 'o') {
      // Manual/Explicit Check-out
      let targetId = attendanceId;
      let activeRecord = null;

      if (!targetId || targetId === 0) {
        // Find the latest incomplete check-in for this worker
        const { data, error: findError } = await supabase
          .from('attendance')
          .select('*')
          .eq('worker_id', workerId)
          .eq('status', 'i')
          .is('check_out_date_time', null)
          .order('check_in_date_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError) throw findError;
        if (!data) {
          return res.status(400).json(
            errorResponse(
              ERROR_CODES.NOT_FOUND,
              'No active check-in found for this worker.',
              'attendance'
            )
          );
        }
        activeRecord = data;
        targetId = activeRecord.attendance_id;
      } else {
        // Fetch the record to calculate hours
        const { data, error: fetchError } = await supabase
          .from('attendance')
          .select('*')
          .eq('attendance_id', targetId)
          .single();
        if (fetchError) throw fetchError;
        activeRecord = data;
      }

      const checkOutTime = checkOutDateTime || new Date().toISOString();
      const checkInTime = activeRecord.check_in_date_time;

      // Calculate Hours
      const durationMs = new Date(checkOutTime) - new Date(checkInTime);
      const hours = Math.max(0, durationMs / (1000 * 60 * 60)).toFixed(2);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_date_time: checkOutTime,
          status: 'o',
          gross_hours: parseFloat(hours),
          effective_hours: parseFloat(hours) // Can be adjusted for breaks later
        })
        .eq('attendance_id', targetId)
        .select()
        .single();

      if (error) throw error;
      result = data;
      message = `Logout successful. Total hours: ${hours}`;

    } else if (status === 'i') {
      // Manual/Explicit Check-in
      const today = new Date().toISOString().split('T')[0];

      // Check if ALREADY checked in (don't allow double check-in)
      const { data: activeRecords, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', workerId)
        .eq('status', 'i')
        .is('check_out_date_time', null);

      if (checkError) throw checkError;

      if (activeRecords && activeRecords.length > 0) {
        return res.status(400).json(successResponse({
          statusCode: 400,
          message: 'You are already logged in. Please logout before checking in again.'
        }));
      }

      // Create new attendance record (Multiple check-ins per day are now allowed as long as previous is closed)
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          establishment_id: establishmentId,
          worker_id: workerId,
          estmt_worker_id: estmtWorkerId,
          work_location: workLocation || '',
          check_in_date_time: checkInDateTime || new Date().toISOString(),
          check_out_date_time: null,
          status: 'i',
          gross_hours: 0,
          effective_hours: 0
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      message = 'Login successful. Attendance has started.';
    }


    res.json(successResponse({
      statusCode: 200,
      message: message,
      data: result
    }));
  } catch (error) {
    next(error);
  }
};




/**
 * Get daily attendance status for a worker
 * GET /api/attendance/status/:workerId
 */
export const getDailyStatus = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const { data: records, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .gte('check_in_date_time', `${date}T00:00:00`)
      .lte('check_in_date_time', `${date}T23:59:59`)
      .order('check_in_date_time', { ascending: false });

    if (error) throw error;

    let statusStr = "Absent";
    let message = "No activity found.";

    if (records && records.length > 0) {
      const hasComplete = records.some(r => r.status === 'o' || r.check_out_date_time);
      const hasIncomplete = records.some(r => r.status === 'i' && !r.check_out_date_time);

      if (hasComplete) {
        statusStr = "Present";
        message = "Attendance marked as Present.";
      } else if (hasIncomplete) {
        statusStr = "Incomplete";
        message = "Attendance incomplete. Login recorded without logout.";
      }
    }

    res.json(successResponse({
      status: statusStr,
      message: message,
      records: records
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly attendance summary for a worker
 * GET /api/attendance/summary/worker/:workerId
 */
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { month, year } = req.query; // e.g. 05, 2024

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId);

    if (month && year) {
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('check_in_date_time', `${startDate}T00:00:00`)
        .lte('check_in_date_time', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json(successResponse([], 'No attendance records found for the selected month.'));
    }

    res.json(successResponse(data, 'Monthly attendance summary retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly attendance report for all workers in an establishment
 * GET /api/attendance/report/establishment/:establishmentId
 */
export const getEstablishmentMonthlyReport = async (req, res, next) => {
  try {
    const { establishmentId } = req.params;
    const user = req.user;

    // Simple access check
    if (user.role !== 'establishment' && user.role !== 'department' && user.role !== 'admin') {
      return res.status(403).json(errorResponse(ERROR_CODES.AUTHORIZATION_ERROR, 'You do not have permission to view this data.'));
    }

    const { month, year } = req.query;
    let query = supabase
      .from('attendance')
      .select(`
                *,
                worker:worker_id (worker_id, full_name, mobile_number)
            `)
      .eq('establishment_id', establishmentId);

    if (month && year) {
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('check_in_date_time', `${startDate}T00:00:00`)
        .lte('check_in_date_time', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(successResponse(data || [], 'Monthly attendance data for all workers loaded successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get department-wise attendance data
 * GET /api/attendance/report/department/:departmentId
 */
export const getDepartmentAttendanceData = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const user = req.user;

    if (user.role !== 'department' && user.role !== 'admin') {
      return res.status(403).json(errorResponse(ERROR_CODES.AUTHORIZATION_ERROR, 'Invalid department or access restricted.'));
    }

    // Logic here would typically fetch data for all establishments under this department
    // For now, we'll fetch attendance where the establishment belongs to this department
    // Join with establishment table
    const { data, error } = await supabase
      .from('attendance')
      .select(`
                *,
                establishment!inner (establishment_id, department_id, establishment_name),
                worker:worker_id (full_name)
            `)
      .eq('establishment.department_id', departmentId);

    if (error) throw error;

    res.json(successResponse(data || [], 'Department-wise attendance data loaded successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance history for a worker (Original)
 */
export const getWorkerAttendance = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select(`*, establishment:establishment_id (establishment_name)`)
      .eq('worker_id', workerId)
      .order('check_in_date_time', { ascending: false });

    if (error) throw error;
    res.json(successResponse(attendance || []));
  } catch (error) {
    next(error);
  }
};

/**
 * Get today's attendance for the logged-in user context
 */
export const getTodayAttendance = async (req, res, next) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];
    let query = supabase.from('attendance').select(`*, worker:worker_id (full_name)`).gte('check_in_date_time', `${today}T00:00:00`);

    if (user.role === 'worker') query = query.eq('worker_id', user.workerId || user.id);
    else if (user.role === 'establishment') query = query.eq('establishment_id', user.establishmentId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(successResponse(data || []));
  } catch (error) {
    next(error);
  }
};

// ... keep other original functions if needed or keep it clean
export const getEstablishmentAttendance = async (req, res, next) => {
  try {
    const { establishmentId } = req.params;
    const { data, error } = await supabase.from('attendance').select(`*, worker:worker_id (full_name)`).eq('establishment_id', establishmentId);
    if (error) throw error;
    res.json(successResponse(data || []));
  } catch (error) {
    next(error);
  }
};

export const getCurrentlyCheckedInWorkers = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('attendance').select(`*, worker:worker_id (full_name)`).eq('status', 'i').is('check_out_date_time', null);
    if (error) throw error;
    res.json(successResponse(data || []));
  } catch (error) {
    next(error);
  }
};

export const getCurrentCount = async (req, res, next) => {
  try {
    const { count, error } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'i').is('check_out_date_time', null);
    if (error) throw error;
    res.json(successResponse({ count: count || 0 }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get worker monthly attendance summary with counts
 * GET /api/attendance/worker/:workerId/monthly-summary
 */
export const getWorkerMonthlySummaryWithCounts = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const currentDate = new Date();
    const month = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();

    // Role-based access control
    if (req.user && req.user.role === 'worker' && req.user.id !== parseInt(workerId)) {
      return res.status(403).json(errorResponse(ERROR_CODES.AUTHORIZATION_ERROR, 'You can only view your own attendance data.'));
    }

    // Calculate date range
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch attendance records for the month
    const { data: attendanceRecords, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .gte('check_in_date_time', `${startDate}T00:00:00`)
      .lte('check_in_date_time', `${endDate}T23:59:59`)
      .order('check_in_date_time', { ascending: true });

    if (error) throw error;

    // Calculate working days (Mon-Fri) in the month
    let totalWorkingDays = 0;
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        totalWorkingDays++;
      }
    }

    // Count unique days present
    const uniqueDatesPresent = new Set();
    const dailyRecords = [];

    if (attendanceRecords && attendanceRecords.length > 0) {
      attendanceRecords.forEach(record => {
        const recordDate = record.check_in_date_time.split('T')[0];
        uniqueDatesPresent.add(recordDate);

        dailyRecords.push({
          date: recordDate,
          checkIn: record.check_in_date_time,
          checkOut: record.check_out_date_time,
          status: record.check_out_date_time ? 'present' : 'incomplete',
          workLocation: record.work_location
        });
      });
    }

    const daysPresent = uniqueDatesPresent.size;
    const daysAbsent = totalWorkingDays - daysPresent;

    res.json(successResponse({
      workerId: parseInt(workerId),
      month,
      year,
      totalWorkingDays,
      daysPresent,
      daysAbsent,
      attendancePercentage: totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 100) : 0,
      attendanceRecords: dailyRecords
    }, 'Worker monthly summary retrieved successfully.'));

  } catch (error) {
    next(error);
  }
};

/**
 * Get establishment department-wise statistics
 * GET /api/attendance/establishment/:establishmentId/department-stats
 */
export const getEstablishmentDepartmentStats = async (req, res, next) => {
  try {
    const { establishmentId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Role-based access control
    if (req.user && req.user.role === 'establishment' && req.user.id !== parseInt(establishmentId)) {
      return res.status(403).json(errorResponse(ERROR_CODES.AUTHORIZATION_ERROR, 'You can only view your own establishment data.'));
    }

    // Get all workers for this establishment
    const { data: establishmentWorkers, error: workersError } = await supabase
      .from('establishment_worker')
      .select(`
        estmt_worker_id,
        worker_id,
        worker:worker_id (
          worker_id,
          full_name,
          mobile_number
        )
      `)
      .eq('establishment_id', establishmentId)
      .eq('status', 'active');

    if (workersError) throw workersError;

    // Get attendance for today
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('worker_id, work_location, status, check_in_date_time, check_out_date_time')
      .eq('establishment_id', establishmentId)
      .gte('check_in_date_time', `${date}T00:00:00`)
      .lte('check_in_date_time', `${date}T23:59:59`);

    if (attendanceError) throw attendanceError;

    // Group workers by department (using work_location from attendance or default to "General")
    const departmentMap = new Map();

    // Initialize with all workers
    if (establishmentWorkers) {
      establishmentWorkers.forEach(ew => {
        // Find attendance record for this worker today
        const attendance = todayAttendance?.find(a => a.worker_id === ew.worker_id);
        const department = attendance?.work_location || 'General';

        if (!departmentMap.has(department)) {
          departmentMap.set(department, {
            departmentName: department,
            totalWorkers: 0,
            presentToday: 0,
            absentToday: 0
          });
        }

        const deptStats = departmentMap.get(department);
        deptStats.totalWorkers++;

        if (attendance && attendance.status === 'i') {
          deptStats.presentToday++;
        } else {
          deptStats.absentToday++;
        }
      });
    }

    const departments = Array.from(departmentMap.values());

    res.json(successResponse({
      establishmentId: parseInt(establishmentId),
      date,
      departments
    }, 'Department-wise statistics retrieved successfully.'));

  } catch (error) {
    next(error);
  }
};

/**
 * Get department workers list with attendance status
 * GET /api/attendance/department/:departmentName/workers
 */
export const getDepartmentWorkersWithAttendance = async (req, res, next) => {
  try {
    const { departmentName } = req.params;
    const { establishmentId, date } = req.query;

    if (!establishmentId) {
      return res.status(400).json(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'establishmentId query parameter is required.'));
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get all workers for this establishment
    const { data: establishmentWorkers, error: workersError } = await supabase
      .from('establishment_worker')
      .select(`
        estmt_worker_id,
        worker_id,
        worker:worker_id (
          worker_id,
          full_name,
          mobile_number,
          email_id
        )
      `)
      .eq('establishment_id', establishmentId)
      .eq('status', 'active');

    if (workersError) throw workersError;

    // Get attendance for the specified date
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('establishment_id', establishmentId)
      .gte('check_in_date_time', `${targetDate}T00:00:00`)
      .lte('check_in_date_time', `${targetDate}T23:59:59`);

    if (attendanceError) throw attendanceError;

    // Filter workers by department and build response
    const workers = [];

    if (establishmentWorkers) {
      establishmentWorkers.forEach(ew => {
        const attendance = attendanceRecords?.find(a => a.worker_id === ew.worker_id);
        const workerDepartment = attendance?.work_location || 'General';

        // Filter by department name
        if (workerDepartment === departmentName || departmentName === 'All') {
          workers.push({
            workerId: ew.worker?.worker_id,
            fullName: ew.worker?.full_name,
            mobileNumber: ew.worker?.mobile_number,
            emailId: ew.worker?.email_id,
            attendanceStatus: attendance ? 'present' : 'absent',
            checkInTime: attendance?.check_in_date_time || null,
            checkOutTime: attendance?.check_out_date_time || null,
            workLocation: attendance?.work_location || null
          });
        }
      });
    }

    res.json(successResponse({
      departmentName,
      establishmentId: parseInt(establishmentId),
      date: targetDate,
      workers
    }, 'Department workers list retrieved successfully.'));

  } catch (error) {
    next(error);
  }
};
