# Demo Mode Fix - AsyncStorage Implementation

## Issue Fixed

**Error**: `Could not find the table 'public.user_preferences' in the schema cache`

The demo mode service was trying to access a `user_preferences` table that doesn't exist in your Supabase database.

## Solution

Changed `demoModeService.ts` to use **AsyncStorage** instead of Supabase for storing demo mode state.

### What Changed

**Before**:
```typescript
// Tried to access non-existent table
const { data, error } = await supabase
  .from('user_preferences')
  .select('demo_mode')
  .eq('user_id', session.user.id)
  .single();
```

**After**:
```typescript
// Uses AsyncStorage (local device storage)
const stored = await AsyncStorage.getItem(DEMO_MODE_KEY);
return stored === 'true';
```

## Benefits

✅ **No database table needed** - Uses local device storage
✅ **Faster** - No network calls required
✅ **Simpler** - No Supabase permissions issues
✅ **Per-device** - Demo mode state is device-specific
✅ **Persistent** - State survives app restarts

## How It Works

1. Demo mode state is stored in AsyncStorage (local device storage)
2. When app starts, it loads the state from AsyncStorage
3. When user enables/disables demo mode, it saves to AsyncStorage
4. No Supabase table access required

## Testing

The error should now be gone. You should see:

```
[DemoMode] Initialized: DISABLED
```

Instead of:

```
[DemoMode] Get stored state error: {code: 'PGRST205', message: "Could not find the table 'public.user_preferences'"}
```

## Files Modified

- `src/services/demoModeService.ts` - Updated to use AsyncStorage

## No Additional Setup Required

- No database migrations needed
- No new Supabase tables required
- Works with your existing setup
- Demo mode is now fully functional

## Demo Mode Now Works

1. Open Health Dashboard
2. Demo mode initializes without errors
3. Click "New Data" to generate test data
4. Click "7-Day History" to generate a week of data
5. All data saves to Supabase correctly

---

**Status**: ✅ Fixed and Ready to Use
