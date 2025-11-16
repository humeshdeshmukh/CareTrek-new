// This script will help us check the status values in the family_connections table
// and the structure of the table

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Anon Key in environment variables');
  console.log('Make sure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusValues() {
  try {
    // First, let's see the distinct status values in the table
    const { data: statusValues, error: statusError } = await supabase
      .from('family_connections')
      .select('status')
      .not('status', 'is', null);

    if (statusError) throw statusError;
    
    const uniqueStatuses = [...new Set(statusValues.map(item => item.status))];
    console.log('Distinct status values in family_connections:', uniqueStatuses);

    // Let's also check the table structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'family_connections' })
      .single();
    
    if (tableError) console.log('Could not get table info:', tableError.message);
    else console.log('Table info:', JSON.stringify(tableInfo, null, 2));

  } catch (error) {
    console.error('Error checking status values:', error);
  }
}

checkStatusValues();
