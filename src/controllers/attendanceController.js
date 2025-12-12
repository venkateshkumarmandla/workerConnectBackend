import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';

/**
 * Worker check-in or check-out
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

    // Validate status
    if (!['i', 'o'].includes(status)) {
      return res.status(400).json(
        errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Status must be either "i" (check-in) or "o" (check-out)',
          'status'
        )
      );
    }

    let result;
    let message;

    if (attendanceId && attendanceId !== 0) {
      // Update existing attendance (check-out)
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_date_time: checkOutDateTime || new Date().toISOString(),
          status: 'o'
        })
        .eq('attendance_id', attendanceId)
        .select()
        .single();

      if (error) throw error;
      result = data;
      message = 'Checked out successfully';

    } else {
      // Check if worker is already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingCheckIn, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', workerId)
        .eq('establishment_id', establishmentId)
        .gte('check_in_date_time', `${today}T00:00:00`)
        .eq('status', 'i')
        .is('check_out_date_time', null)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw checkError;
      }

      if (existingCheckIn && status === 'i') {
        return res.status(400).json(
          errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Worker is already checked in. Please check out first.',
            'workerId',
            ['Use the existing attendanceId to check out']
          )
        );
      }

      // Create new attendance (check-in)
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
      message = 'Checked in successfully';
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
 * Get attendance history for a worker
 * GET /api/attendance/worker/:workerId
 */
export const getWorkerAttendance = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        establishment:establishment_id (
          establishment_id,
          establishment_name
        )
      `)
      .eq('worker_id', workerId)
      .order('check_in_date_time', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('check_in_date_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_in_date_time', endDate);
    }

    const { data: attendance, error } = await query;

    if (error) throw error;

    res.json(successResponse(attendance || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance history for an establishment
 * GET /api/attendance/establishment/:establishmentId
 */
export const getEstablishmentAttendance = async (req, res, next) => {
  try {
    const { establishmentId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        worker:worker_id (
          worker_id,
          full_name,
          mobile_number
        )
      `)
      .eq('establishment_id', establishmentId)
      .order('check_in_date_time', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('check_in_date_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_in_date_time', endDate);
    }

    const { data: attendance, error } = await query;

    if (error) throw error;

    res.json(successResponse(attendance || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Get currently checked-in workers
 * GET /api/attendance/current?establishmentId={id}
 */
export const getCurrentlyCheckedInWorkers = async (req, res, next) => {
  try {
    const { establishmentId } = req.query;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        worker:worker_id (
          worker_id,
          full_name,
          mobile_number
        ),
        establishment:establishment_id (
          establishment_id,
          establishment_name
        )
      `)
      .eq('status', 'i')
      .is('check_out_date_time', null);

    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }

    const { data: checkedInWorkers, error } = await query;

    if (error) throw error;

    res.json(successResponse(checkedInWorkers || []));

  } catch (error) {
    next(error);
  }
};

/**
 * Get today's attendance
 * GET /api/attendance/today
 */
export const getTodayAttendance = async (req, res, next) => {
  try {
    const { establishmentId } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const userRole = req.user?.role;
    const userEstablishmentId = req.user?.establishmentId;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        worker:worker_id (
          worker_id,
          full_name,
          mobile_number
        ),
        establishment:establishment_id (
          establishment_id,
          establishment_name
        )
      `)
      .gte('check_in_date_time', `${today}T00:00:00`)
      .order('check_in_date_time', { ascending: false });

    // Filter by establishment if provided or enforced by role
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    } else if (userRole === 'establishment_admin' && userEstablishmentId) {
      query = query.eq('establishment_id', userEstablishmentId);
    }

    const { data: attendance, error } = await query;

    if (error) throw error;

    res.json(successResponse({
      data: attendance || [],
      date: today
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Get current checked-in count
 * GET /api/attendance/current/count
 */
export const getCurrentCount = async (req, res, next) => {
  try {
    const { establishmentId } = req.query;
    const userRole = req.user?.role;
    const userEstablishmentId = req.user?.establishmentId;

    let query = supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'i')
      .is('check_out_date_time', null);

    // Filter by establishment if provided or enforced by role
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    } else if (userRole === 'establishment_admin' && userEstablishmentId) {
      query = query.eq('establishment_id', userEstablishmentId);
    }

    const { count, error } = await query;

    if (error) throw error;

    res.json(successResponse({
      count: count || 0
    }));

  } catch (error) {
    next(error);
  }
};
