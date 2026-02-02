import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkPassword() {
    try {
        console.log('🔐 Checking password for worker 7013815249...\n');

        // Get worker with password
        const { data: worker, error } = await supabase
            .from('worker')
            .select('worker_id, mobile_number, password, status')
            .eq('mobile_number', 7013815249)
            .single();

        if (error || !worker) {
            console.error('❌ Worker not found:', error?.message);
            return;
        }

        console.log('✅ Worker found:');
        console.log('   ID:', worker.worker_id);
        console.log('   Mobile:', worker.mobile_number);
        console.log('   Status:', worker.status);
        console.log('   Password (hashed):', worker.password?.substring(0, 30) + '...');
        console.log('');

        // Test password
        const testPassword = 'Venky6520@';
        console.log(`🔍 Testing password: "${testPassword}"\n`);

        if (!worker.password) {
            console.error('❌ No password set for this worker!');
            console.log('   The worker may have been created without a password.');
            console.log('   You need to update the password in the database.\n');

            // Generate a new hash
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(testPassword, salt);

            console.log('📝 To fix this, run this SQL:');
            console.log(`   UPDATE worker SET password = '${hashedPassword}' WHERE worker_id = ${worker.worker_id};`);
            console.log('');
            return;
        }

        // Verify password
        const isMatch = await bcrypt.compare(testPassword, worker.password);

        if (isMatch) {
            console.log('✅ Password matches! Login should work.');
        } else {
            console.log('❌ Password does NOT match!');
            console.log('   The stored hash does not match "Venky6520@"');
            console.log('');

            // Generate new hash
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(testPassword, salt);

            console.log('📝 To reset the password to "Venky6520@", run this SQL:');
            console.log(`   UPDATE worker SET password = '${hashedPassword}' WHERE worker_id = ${worker.worker_id};`);
            console.log('');
            console.log('Or run this Node.js code:');
            console.log(`   const hashedPassword = await bcrypt.hash('Venky6520@', 10);`);
            console.log(`   await supabase.from('worker').update({ password: hashedPassword }).eq('worker_id', ${worker.worker_id});`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPassword();
