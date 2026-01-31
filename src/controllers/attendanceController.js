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

    if (status === 'o' || (attendanceId && attendanceId !== 0)) {
      // Manual/Explicit Check-out
      const targetId = attendanceId || 0;

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_date_time: checkOutDateTime || new Date().toISOString(),
          status: 'o'
        })
        .eq('attendance_id', targetId)
        .select()
        .single();

      if (error) throw error;
      result = data;
      message = 'Logout successful. Attendance recorded for today.';

    } else if (status === 'i') {
      // Manual/Explicit Check-in
      const today = new Date().toISOString().split('T')[0];

      // Check for existing records today
      const { data: todayRecords, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', workerId)
        .gte('check_in_date_time', `${today}T00:00:00`)
        .order('check_in_date_time', { ascending: false });

      if (checkError) throw checkError;

      if (todayRecords && todayRecords.length > 0) {
        const lastRecord = todayRecords[0];
        if (lastRecord.status === 'i' && !lastRecord.check_out_date_time) {
          return res.status(400).json(successResponse({ statusCode: 400, message: 'You are already logged in for today.' }));
        }
        if (lastRecord.status === 'o' || lastRecord.check_out_date_time) {
          return res.status(400).json(successResponse({ statusCode: 400, message: 'Attendance already recorded for today.' }));
        }
      }

      // Create new attendance
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          establishment_id: establishmentId,
          worker_id: workerId,
          estmt_worker_id: estmtWorkerId,
          work_location: workLocation || '',
          check_in_date_time: checkInDateTime || new Date().toISOString(),
          check_out_date_time: null,
          status: 'i'
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      message = 'Login successful. Attendance has started for today.';
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
