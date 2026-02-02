import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    try {
        console.log('🚀 Assigning Worker 1 to existing Establishment 2...\n');

        // Assign worker 1 to establishment 2
        const { data: assign, error: assignError } = await supabase
            .from('establishment_worker')
            .upsert({
                establishment_id: 2, // tekworks
                worker_id: 1, // venkatesh Kumar
                estmt_worker_id: 1001,
                aadhaar_card_number: '845459518784',
                work_location: 'Building Site A',
                status: 'active',
                working_from_date: '2026-01-01'
            })
            .select()
            .single();

        if (assignError) {
            console.error('❌ Error assigning worker:', assignError.message);
            return;
        }
        console.log('✅ Worker ID 1 assigned to Establishment ID 2 (tekworks)');

        console.log('\n✨ Database assignment complete! Try checking in now.');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

seedData();
