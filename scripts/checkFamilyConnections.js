const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Anon Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  try {
    // Get table structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'family_connections' });
    
    if (tableError) throw tableError;
    
    console.log('Table structure:', JSON.stringify(tableInfo, null, 2));
    
    // Get constraints
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'family_connections');
    
    if (constraintError) throw constraintError;
    
    console.log('Table constraints:', JSON.stringify(constraints, null, 2));
    
    // Get check constraints
    const { data: checkConstraints, error: checkError } = await supabase
      .from('information_schema.check_constraints')
      .select('*')
      .ilike('constraint_name', '%family_connections%');
    
    if (checkError) throw checkError;
    
    console.log('Check constraints:', JSON.stringify(checkConstraints, null, 2));
    
    // Get enum values if status is an enum
    const { data: enumTypes, error: enumError } = await supabase
      .from('pg_enum')
      .select('*')
      .ilike('enumtypid::regtype', '%family_connections_status%');
    
    if (enumError) console.log('No enum types found or error:', enumError);
    else console.log('Enum values:', JSON.stringify(enumTypes, null, 2));
    
    // Get some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('family_connections')
      .select('*')
      .limit(1);
    
    if (sampleError) console.log('Error getting sample data:', sampleError);
    else console.log('Sample data:', JSON.stringify(sampleData, null, 2));
    
  } catch (error) {
    console.error('Error checking table schema:', error);
  }
}

checkTableSchema();
