import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Checking Worker Data in Supabase...\n');
console.log('URL:', supabaseUrl ? 'Set' : '❌ Missing');
console.log('Key:', supabaseKey ? `Set (${supabaseKey.length} chars)` : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkWorkerData() {
    try {
        // 1. Find worker by phone number
        console.log('📱 Searching for worker with phone: 7013815249...\n');

        const { data: worker, error: workerError } = await supabase
            .from('worker')
            .select('*')
            .eq('mobile_number', 7013815249)
            .single();

        if (workerError) {
            console.error('❌ Error querying worker:', workerError.message);
            return;
        }

        if (!worker) {
            console.log('❌ No worker found with phone 7013815249');
            console.log('   Please register this worker first.');
            return;
        }

        console.log('✅ Worker Found:');
        console.log('   ID:', worker.worker_id);
        console.log('   Name:', worker.full_name || `${worker.first_name} ${worker.last_name}`);
        console.log('   Mobile:', worker.mobile_number);
        console.log('   Email:', worker.email_id || 'N/A');
        console.log('   Aadhaar:', worker.aadhaar_number || 'N/A');
        console.log('   Status:', worker.status);
        console.log('');

        const workerId = worker.worker_id;

        // 2. Check establishment assignment
        console.log('🏢 Checking establishment assignment...\n');

        const { data: assignment, error: assignError } = await supabase
            .from('establishment_worker')
            .select(`
        *,
        establishment:establishment_id (
          establishment_id,
          establishment_name
        )
      `)
            .eq('worker_id', workerId)
            .eq('status', 'active')
            .maybeSingle();

        if (assignError) {
            console.error('❌ Error querying assignment:', assignError.message);
        } else if (!assignment) {
            console.log('⚠️  Worker is NOT assigned to any establishment');
            console.log('   This may limit dashboard functionality.');
        } else {
            console.log('✅ Establishment Assignment:');
            console.log('   Establishment ID:', assignment.establishment_id);
            console.log('   Establishment Name:', assignment.establishment.establishment_name);
            console.log('   Worker ID (estmt):', assignment.estmt_worker_id);
            console.log('   Work Location:', assignment.work_location || 'N/A');
        }
        console.log('');

        // 3. Check attendance records
        console.log('📅 Checking attendance records...\n');

        const { data: allAttendance, error: attError } = await supabase
            .from('attendance')
            .select('*')
            .eq('worker_id', workerId)
            .order('check_in_date_time', { ascending: false })
            .limit(10);

        if (attError) {
            console.error('❌ Error querying attendance:', attError.message);
        } else if (!allAttendance || allAttendance.length === 0) {
            console.log('⚠️  NO attendance records found for this worker');
            console.log('   Worker needs to check in first.');
        } else {
            console.log(`✅ Found ${allAttendance.length} recent attendance records:\n`);
            allAttendance.forEach((record, index) => {
                console.log(`   ${index + 1}. Date: ${record.check_in_date_time?.split('T')[0] || 'N/A'}`);
                console.log(`      Check-in: ${record.check_in_date_time || 'N/A'}`);
                console.log(`      Check-out: ${record.check_out_date_time || 'Still logged in'}`);
                console.log(`      Status: ${record.status === 'i' ? 'Incomplete' : 'Complete'}`);
                console.log('');
            });
        }

        // 4. Get current month statistics
        console.log('📊 Current Month Statistics...\n');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: monthRecords, error: statsError } = await supabase
            .from('attendance')
            .select('*')
            .eq('worker_id', workerId)
            .gte('check_in_date_time', startOfMonth.toISOString());

        if (statsError) {
            console.error('❌ Error querying month stats:', statsError.message);
        } else {
            const present = monthRecords.filter(r => r.status === 'o' || r.check_out_date_time).length;
            const incomplete = monthRecords.filter(r => r.status === 'i' && !r.check_out_date_time).length;

            console.log(`   Total Records: ${monthRecords.length}`);
            console.log(`   Present (completed): ${present}`);
            console.log(`   Incomplete: ${incomplete}`);
        }
        console.log('');
        console.log('✨ Database check complete!');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkWorkerData();
