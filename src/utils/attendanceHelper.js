import { supabase } from '../config/supabase.js';

/**
 * Automatically record a check-in when a worker logs in
 * @param {string|number} workerId - The worker's ID
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export const recordLoginAttendance = async (workerId) => {
    try {
        console.log(`🕒 [Attendance Helper] Starting login record for worker: ${workerId}`);

        if (!workerId) {
            return { success: false, message: 'workerId is missing' };
        }

        // 1. Get current active establishment for this worker
        const { data: estWorker, error: estError } = await supabase
            .from('establishment_worker')
            .select('*')
            .eq('worker_id', workerId)
            .eq('status', 'active')
            .maybeSingle();

        if (estError) {
            console.error('❌ [Attendance] Error fetching assignment:', estError);
            return { success: false, message: 'Database error fetching assignment' };
        }

        if (!estWorker) {
            console.log(`ℹ️ [Attendance] No active establishment assignment found for worker ${workerId}`);
            return { success: false, message: 'No active establishment assignment found.' };
        }

        console.log(`✅ [Attendance] Found assignment: Est ${estWorker.establishment_id}, E-Worker ID ${estWorker.estmt_worker_id}`);

        // 2. Check if already recorded for today
        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 [Attendance] Checking records for date: ${today}`);

        // Check for ANY record for today (even if checked out)
        const { data: todayRecords, error: historyError } = await supabase
            .from('attendance')
            .select('*')
            .eq('worker_id', workerId)
            .eq('establishment_id', estWorker.establishment_id)
            .gte('check_in_date_time', `${today}T00:00:00`)
            .order('check_in_date_time', { ascending: false });

        if (historyError) {
            console.error('❌ [Attendance] Error fetching history:', historyError);
            return { success: false, message: 'Database error checking existing records' };
        }

        // Handle specific messages based on records
        if (todayRecords && todayRecords.length > 0) {
            const lastRecord = todayRecords[0];
            console.log(`🔍 [Attendance] Found existing record for today. Status: ${lastRecord.status}, Check-out: ${lastRecord.check_out_date_time}`);

            // If there's an active check-in (not checked out), return success but indicate already active
            if (lastRecord.status === 'i' && !lastRecord.check_out_date_time) {
                console.log('✅ [Attendance] Worker already has an active check-in for today.');
                return { success: true, message: 'You are already logged in for today.', alreadyActive: true };
            }

            // If they already checked out, allow them to check in again (Multi-session)
            console.log('ℹ️ [Attendance] Previous session closed. Allowing new session.');
        }

        // 3. Create new check-in record
        console.log(`📝 [Attendance] Inserting check-in record...`);
        const { data, error } = await supabase
            .from('attendance')
            .insert({
                establishment_id: estWorker.establishment_id,
                worker_id: workerId,
                estmt_worker_id: estWorker.estmt_worker_id,
                work_location: estWorker.work_location || 'Assigned Location',
                check_in_date_time: new Date().toISOString(),
                status: 'i'
            })
            .select();

        if (error) {
            console.error('❌ [Attendance] Insert failed:', error);
            return { success: false, message: 'Database error recording attendance' };
        } else {
            console.log(`🚀 [Attendance] Record created successfully: ${data[0].attendance_id}`);
            return { success: true, message: 'Login successful. Attendance has started for today.', data };
        }
    } catch (error) {
        console.error('❌ [Attendance] Unexpected error in recordLoginAttendance:', error);
        return { success: false, message: 'Internal server error during attendance recording' };
    }
};

/**
 * Automatically record a check-out when a worker logs out
 * @param {string|number} workerId - The worker's ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const recordLogoutAttendance = async (workerId) => {
    try {
        console.log(`🕒 [Attendance] Attempting auto check-out for worker: ${workerId}`);

        if (!workerId) {
            return { success: false, message: 'workerId is missing' };
        }

        // Find the current active check-in (most recent status 'i' without checkout time)
        const { data: activeAttendance, error: findError } = await supabase
            .from('attendance')
            .select('attendance_id, check_in_date_time, check_out_date_time')
            .eq('worker_id', workerId)
            .eq('status', 'i')
            .is('check_out_date_time', null)
            .order('check_in_date_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (findError) {
            console.error('❌ [Attendance] Error finding active check-in:', findError);
            return { success: false, message: 'Database error finding check-in' };
        }

        if (!activeAttendance) {
            // Check if they already checked out today or if they never checked in
            const today = new Date().toISOString().split('T')[0];
            const { data: todayRecords } = await supabase
                .from('attendance')
                .select('attendance_id')
                .eq('worker_id', workerId)
                .gte('check_in_date_time', `${today}T00:00:00`)
                .neq('status', 'i') // or check status 'o'
                .limit(1);

            if (todayRecords && todayRecords.length > 0) {
                console.log('ℹ️ [Attendance] User already logged out for today.');
                return { success: false, message: 'You have already logged out for today.' };
            }

            console.log('ℹ️ [Attendance] No active check-in found for logout.');
            return { success: false, message: 'Please login before logging out.' };
        }

        // Update with check-out time
        const { error: updateError } = await supabase
            .from('attendance')
            .update({
                check_out_date_time: new Date().toISOString(),
                status: 'o'
            })
            .eq('attendance_id', activeAttendance.attendance_id);

        if (updateError) {
            console.error('❌ [Attendance] Error updating logout attendance:', updateError);
            return { success: false, message: 'Failed to record check-out' };
        } else {
            console.log(`✅ [Attendance] Auto check-out successful for Attendance ID: ${activeAttendance.attendance_id}`);
            return { success: true, message: 'Logout successful. Attendance recorded for today.' };
        }
    } catch (error) {
        console.error('❌ [Attendance] Unexpected error in recordLogoutAttendance:', error);
        return { success: false, message: 'Internal server error during attendance logout' };
    }
};
