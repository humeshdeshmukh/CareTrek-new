# Apply Missing Database Migrations

**Date**: November 18, 2025
**Issue**: Hydration and Sleep tables missing from Supabase
**Status**: ✅ Migration files created

---

## Problem

The app is trying to access `hydration_records` and `sleep_records` tables that don't exist in your Supabase database, causing PGRST205 errors.

---

## Solution

Two migration files have been created to add the missing tables:

1. `20241118_create_hydration_tables.sql` - Creates hydration_records and hydration_entries tables
2. `20241118_create_sleep_tables.sql` - Creates sleep_records table

---

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open https://app.supabase.com
   - Select your project
   - Go to SQL Editor

2. **Create New Query**
   - Click "New Query"
   - Copy the entire content from `20241118_create_hydration_tables.sql`
   - Click "Run"
   - Wait for success message

3. **Create Second Query**
   - Click "New Query"
   - Copy the entire content from `20241118_create_sleep_tables.sql`
   - Click "Run"
   - Wait for success message

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Apply migrations
supabase db push
```

### Option 3: Manual SQL Execution

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from each migration file
4. Execute each one

---

## Migration Details

### Hydration Tables

**hydration_records**
- Stores daily hydration goals and totals
- Columns: id, user_id, date, water_intake, goal, created_at, updated_at
- Unique constraint on (user_id, date)

**hydration_entries**
- Stores individual water intake entries
- Columns: id, hydration_record_id, amount, time, type, created_at
- Types: water, juice, tea, coffee, milk, other

### Sleep Tables

**sleep_records**
- Stores daily sleep data
- Columns: id, user_id, date, duration, quality, deep_sleep, light_sleep, rem_sleep, awake_time, start_time, end_time, created_at, updated_at
- Unique constraint on (user_id, date)

---

## Verification

After applying migrations, verify they were created:

1. **In Supabase Dashboard**
   - Go to Table Editor
   - Look for `hydration_records`, `hydration_entries`, `sleep_records`
   - They should all be visible

2. **In Your App**
   - Open HydrationScreen
   - Should no longer show PGRST205 errors
   - Open SleepScreen
   - Should no longer show errors

---

## What Gets Created

### Tables
- ✅ hydration_records
- ✅ hydration_entries
- ✅ sleep_records

### Indexes (for performance)
- ✅ idx_hydration_records_user_id
- ✅ idx_hydration_records_date
- ✅ idx_hydration_records_user_date
- ✅ idx_hydration_entries_record_id
- ✅ idx_sleep_records_user_id
- ✅ idx_sleep_records_date
- ✅ idx_sleep_records_user_date

### Security (RLS Policies)
- ✅ Users can only view their own records
- ✅ Users can only insert their own records
- ✅ Users can only update their own records
- ✅ Users can only delete their own records

---

## After Migration

Once migrations are applied:

1. **Restart your app**
   - Close the app completely
   - Reopen it
   - Errors should be gone

2. **Test HydrationScreen**
   - Navigate to Hydration
   - Should load without errors
   - Try adding water
   - Data should save

3. **Test SleepScreen**
   - Navigate to Sleep
   - Should load without errors
   - Data should display

---

## Troubleshooting

### Still getting PGRST205 error?

1. **Verify migrations were applied**
   - Go to Supabase Dashboard
   - Check Table Editor
   - Look for the tables

2. **Clear app cache**
   - Close app completely
   - Clear app data/cache
   - Reopen app

3. **Check RLS policies**
   - Go to Supabase Dashboard
   - Select table
   - Check "RLS" tab
   - Policies should be enabled

### Migrations failed?

1. **Check error message**
   - Note the exact error
   - Check if table already exists

2. **Try dropping and recreating**
   - Go to SQL Editor
   - Run: `DROP TABLE IF EXISTS public.hydration_records CASCADE;`
   - Run: `DROP TABLE IF EXISTS public.sleep_records CASCADE;`
   - Re-run the migration files

3. **Contact support**
   - If issues persist, check Supabase documentation

---

## Files Created

- `database/migrations/20241118_create_hydration_tables.sql`
- `database/migrations/20241118_create_sleep_tables.sql`

---

## Next Steps

1. ✅ Apply both migration files
2. ✅ Verify tables were created
3. ✅ Restart app
4. ✅ Test HydrationScreen and SleepScreen
5. ✅ Verify no more errors

---

**Status**: Ready to apply
**Estimated Time**: 5 minutes
**Difficulty**: Easy

---

**Last Updated**: November 18, 2025, 4:16 PM UTC+05:30
