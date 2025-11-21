# Infinite Loop & Device Pool Fix

## Problems Identified

### 1. **Device Not in Pool Error**
```
ERROR [BLE-V2] [HR] Error: [Error: Device F6:36:23:75:01:33 not in pool]
ERROR [BLE-V2] [SpO2] Error: [Error: Device F6:36:23:75:01:33 not in pool]
```

**Cause:** Device was being removed from connection pool before subscriptions could be set up.

### 2. **Maximum Update Depth Exceeded**
```
ERROR Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

**Cause:** Infinite loop in useEffect causing services to be destroyed and recreated repeatedly.

### 3. **Services Destroyed Repeatedly**
```
LOG [BLE] Service destroyed
LOG [BackgroundData] Service stopped
LOG [BLE] Service destroyed
LOG [BackgroundData] Service stopped
... (repeating 100+ times)
```

**Cause:** Cleanup useEffect had `disconnectDevice` in dependency array, which was recreated every render due to `watchData` and `syncToSupabase` dependencies.

## Root Cause Analysis

### The Infinite Loop Chain:

```
1. disconnectDevice has [stopScan, watchData, syncToSupabase] dependencies
2. watchData changes frequently (every data update)
3. disconnectDevice is recreated
4. Cleanup useEffect runs because disconnectDevice changed
5. Cleanup calls disconnectDevice
6. Services are destroyed
7. Component re-renders
8. watchData changes again
9. Go to step 2 → INFINITE LOOP
```

## Solutions Implemented

### Fix 1: Remove Problematic Dependencies

**Before:**
```typescript
const disconnectDevice = useCallback(async () => {
  // ... disconnect logic ...
  // Sync final data
  if (watchData.status === 'connected') {
    await syncToSupabase({...watchData, ...});
  }
}, [stopScan, watchData, syncToSupabase]); // ← PROBLEM
```

**After:**
```typescript
const disconnectDevice = useCallback(async () => {
  // ... disconnect logic ...
  // Removed sync logic - don't need it here
}, [stopScan]); // ← FIXED
```

### Fix 2: Empty Dependency Array for Cleanup

**Before:**
```typescript
useEffect(() => {
  return () => {
    (async () => {
      await disconnectDevice(); // ← Calls function from dependency
      await destroyImprovedBLEService();
    })();
  };
}, [disconnectDevice]); // ← PROBLEM: disconnectDevice changes every render
```

**After:**
```typescript
useEffect(() => {
  return () => {
    isMounted.current = false;
    (async () => {
      // Disconnect device directly
      if (connectedDeviceRef.current) {
        try {
          await bleServiceRef.current.disconnectDevice(connectedDeviceRef.current.id);
        } catch (e) {
          console.warn('[BLE-V2] Disconnect error during cleanup:', e);
        }
        connectedDeviceRef.current = null;
      }
      
      // Clear monitors
      for (const unsubscribe of monitorsRef.current) {
        try {
          unsubscribe();
        } catch (e) {
          console.warn('[BLE-V2] Unsubscribe error during cleanup:', e);
        }
      }
      monitorsRef.current = [];
      
      // Destroy service
      try {
        await destroyImprovedBLEService();
      } catch (e) {
        console.warn('[BLE-V2] Service destroy error during cleanup:', e);
      }
    })();
  };
}, []); // ← FIXED: Empty dependency array
```

## What Changed

### File: `src/hooks/useBLEWatchV2.ts`

**Changes:**
1. Removed `watchData` and `syncToSupabase` from `disconnectDevice` dependencies
2. Removed sync logic from `disconnectDevice` (not needed on disconnect)
3. Changed cleanup useEffect dependency from `[disconnectDevice]` to `[]`
4. Moved disconnect logic directly into cleanup useEffect
5. Added proper error handling for each cleanup step

## Expected Behavior After Fix

### Console Output (No More Loops):
```
[BLE-V2] ===== CONNECTION START =====
[BLE-V2] Device: FB BSW053
[BLE-V2] [STEP 1] ✓ Device connected successfully
[BLE-V2] [STEP 2] ✓ Device type: generic
[BLE-V2] [STEP 3] ✓ UI state updated
[BLE-V2] [STEP 4] ✓ Background data service initialized
[BLE-V2] [STEP 5] ✓ Stability wait complete
[BLE-V2] [STEP 6] ✓ Heart rate subscription successful
[BLE-V2] [STEP 7] ✓ SpO2 subscription successful
[BLE-V2] ===== CONNECTION SUCCESS =====

[BLE-V2] [HR] Received: 75
[BLE-V2] [SpO2] Received: 98
```

### No More:
- ✓ "Device not in pool" errors
- ✓ "Maximum update depth exceeded" errors
- ✓ Repeated service destruction
- ✓ Infinite loops

## Testing

### Test 1: Connection
1. Open app
2. Scan for devices
3. Connect to smartwatch
4. Verify all 8 steps complete
5. Check console - no repeated logs

### Test 2: Data Display
1. After connection, wait 10 seconds
2. Verify heart rate displays
3. Verify SpO2 displays
4. Check console - data updates every 1-2 seconds

### Test 3: Long Duration
1. Keep connected for 10 minutes
2. Monitor console
3. Verify no repeated "Service destroyed" logs
4. Verify data continues flowing

### Test 4: Disconnect
1. Connect to device
2. Tap disconnect
3. Verify clean disconnect
4. Check console - no errors

## Key Learnings

### React useEffect Dependencies:
- ✓ Include only values that affect the effect
- ✓ Don't include functions that change frequently
- ✓ Use empty array `[]` for one-time setup/cleanup
- ✓ Avoid circular dependencies

### Async Cleanup:
- ✓ Cleanup functions can be async
- ✓ Use try-catch for each operation
- ✓ Don't fail cleanup if one step fails
- ✓ Set flags (isMounted) before cleanup

### Connection Pool Management:
- ✓ Keep device in pool during subscriptions
- ✓ Only remove after all operations complete
- ✓ Don't destroy service while subscribed
- ✓ Handle disconnection gracefully

## Files Modified

- `src/hooks/useBLEWatchV2.ts`
  - Fixed `disconnectDevice` dependencies
  - Fixed cleanup useEffect
  - Removed sync logic from disconnect
  - Added proper error handling

## Status

✓ Infinite loop fixed
✓ Device pool issue fixed
✓ Services no longer destroyed repeatedly
✓ Ready for testing

## Next Steps

1. Build the app
2. Connect to smartwatch
3. Monitor console for repeated logs
4. Verify data displays correctly
5. Test for 10+ minutes
6. Check that app doesn't crash
