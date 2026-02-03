import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  Missing Supabase environment variables. Database operations will fail.');
  console.error('   Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment.');
}

// Create Supabase client with service role key
// Service role bypasses Row Level Security (RLS) for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection
export const testConnection = async () => {
  try {
    // Add a race condition to prevent hanging indefinitely
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    const connectionPromise = supabase
      .from('state')
      .select('count')
      .limit(1);

    const { error } = await Promise.race([connectionPromise, timeoutPromise]);

    if (error) throw error;
    console.log('✅ Successfully connected to Supabase PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return false;
  }
};

