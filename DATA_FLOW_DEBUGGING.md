# Data Flow Debugging Guide

## Problem

Data is not displaying on HealthScreen tabs even though connection is successful.

## Solution: Comprehensive Logging

Added detailed logging at every step of the data flow to identify where data is being lost.

## Expected Console Output Sequence

### 1. Connection Phase
```
[BLE-V2] [STEP 6] Subscribing to heart rate characteristic...
[BLE-V2] [HR] Monitoring service: 0000180d-0000-1000-8000-00805f9b34fb
[BLE-V2] [HR] Monitoring characteristic: 00002a37-0000-1000-8000-00805f9b34fb
[BLE-V2] [STEP 6] ✓ Heart rate subscription successful
```

### 2. Data Reception Phase (When watch sends data)
```
[BLE-V2] [HR] Callback triggered - error: false characteristic: true
[BLE-V2] [HR] Raw value: <base64-encoded-data>
[BLE-V2] [HR] Buffer length: 2
[BLE-V2] [HR] Parsed - flags: 0 is16: false hr: 75
[BLE-V2] [HR] ✓ Received valid heart rate: 75
[BLE-V2] [HR] Updating state with HR: 75
[BLE-V2] [HR] Added to background service
[BLE-V2] [HR] Saved to local storage
```

### 3. UI Update Phase
```
[HealthScreen] watchData updated: {
  status: 'connected',
  heartRate: 75,
  ...
}
```

## Debugging Checklist

### Step 1: Check Connection
Look for:
```
[BLE-V2] [STEP 6] ✓ Heart rate subscription successful
```

**If NOT present:**
- Connection failed
- Check device compatibility
- Check BLE permissions

**If present:**
- Subscription is registered ✓
- Waiting for data from watch

### Step 2: Check Callback Trigger
Look for:
```
[BLE-V2] [HR] Callback triggered - error: false characteristic: true
```

**If NOT present:**
- Watch is not sending data
- Characteristic monitoring not working
- Device doesn't support notifications

**If present:**
- Watch is sending data ✓
- Callback is being called ✓

### Step 3: Check Data Parsing
Look for:
```
[BLE-V2] [HR] Raw value: <base64>
[BLE-V2] [HR] Buffer length: 2
[BLE-V2] [HR] Parsed - flags: 0 is16: false hr: 75
```

**If NOT present:**
- Data parsing failed
- Check buffer format
- Check base64 decoding

**If present:**
- Data is being parsed ✓
- Heart rate value extracted ✓

### Step 4: Check Validation
Look for:
```
[BLE-V2] [HR] ✓ Received valid heart rate: 75
```

**If NOT present:**
- Heart rate out of range (< 30 or > 220)
- Invalid data format
- Check logs for warning: `[BLE-V2] [HR] Invalid range:`

**If present:**
- Data validation passed ✓
- Ready for state update ✓

### Step 5: Check State Update
Look for:
```
[BLE-V2] [HR] Updating state with HR: 75
```

**If NOT present:**
- Component unmounted
- State update failed
- Check logs for: `[BLE-V2] [HR] Component unmounted`

**If present:**
- State is being updated ✓
- watchData should have heartRate value ✓

### Step 6: Check Storage
Look for:
```
[BLE-V2] [HR] Added to background service
[BLE-V2] [HR] Saved to local storage
```

**If NOT present:**
- Storage services failed
- Check error logs
- Check services initialization

**If present:**
- Data is being persisted ✓

### Step 7: Check UI Update
Look for:
```
[HealthScreen] watchData updated: {
  status: 'connected',
  heartRate: 75,
  ...
}
```

**If NOT present:**
- HealthScreen not receiving updates
- watchData not being passed correctly
- Component not re-rendering

**If present:**
- Data is reaching UI ✓
- Should display on screen ✓

## Common Issues & Solutions

### Issue 1: Callback Never Triggered
**Logs show:**
```
[BLE-V2] [STEP 6] ✓ Heart rate subscription successful
(but no "Callback triggered" logs)
```

**Cause:** Watch not sending data / Device doesn't support notifications

**Solution:**
- Try different watch model
- Check if device supports heart rate notifications
- Try manual read instead of monitoring

### Issue 2: Invalid Range Error
**Logs show:**
```
[BLE-V2] [HR] ✓ Received valid heart rate: 0
[BLE-V2] [HR] Invalid range: 0
```

**Cause:** Heart rate value is 0 or outside 30-220 range

**Solution:**
- Check data format
- Verify watch is measuring
- Check buffer parsing logic

### Issue 3: Component Unmounted
**Logs show:**
```
[BLE-V2] [HR] Component unmounted, skipping update
```

**Cause:** Component unmounted before data arrived

**Solution:**
- Keep component mounted longer
- Check navigation timing
- Ensure cleanup doesn't happen too early

### Issue 4: Storage Errors
**Logs show:**
```
[BLE-V2] [HR] Background service error: ...
[BLE-V2] [HR] Storage error: ...
```

**Cause:** Background or local storage service not initialized

**Solution:**
- Check service initialization
- Verify AsyncStorage available
- Check permissions

### Issue 5: UI Not Updating
**Logs show:**
```
[BLE-V2] [HR] Updating state with HR: 75
(but HealthScreen logs don't show update)
```

**Cause:** HealthScreen not receiving watchData updates

**Solution:**
- Check useBLEWatchV2 hook export
- Verify watchData is being returned
- Check component dependency array

## Testing Steps

### Step 1: Build and Run
```bash
npm run android
```

### Step 2: Open Console
- Watch for connection logs
- Look for all 8 steps

### Step 3: Connect to Watch
- Tap "Scan"
- Select device
- Wait for connection

### Step 4: Monitor Console
- Watch for "Callback triggered" logs
- Look for heart rate values
- Check for errors

### Step 5: Check UI
- Look at Overview tab
- Heart rate should display
- Should update every 1-2 seconds

### Step 6: Debug Issues
- Use logs to identify where data is lost
- Follow debugging checklist above
- Share logs with detailed description

## Log Levels

### ✓ Success Logs
- `[BLE-V2] [HR] ✓ Received valid heart rate: 75`
- `[BLE-V2] [STEP 6] ✓ Heart rate subscription successful`

### ⚠ Warning Logs
- `[BLE-V2] [HR] Invalid range: 0`
- `[BLE-V2] [HR] Component unmounted`

### ✗ Error Logs
- `[BLE-V2] [HR] Monitor error: ...`
- `[BLE-V2] [HR] Parse error: ...`

## Next Steps

1. **Build the app**
   ```bash
   npm run android
   ```

2. **Connect to watch**
   - Watch console for logs
   - Identify where data flow breaks

3. **Share logs**
   - Copy all logs from console
   - Include error messages
   - Include warning messages

4. **Debug based on logs**
   - Use checklist above
   - Follow the data flow
   - Identify the issue

---

**Status: Ready for Testing with Detailed Logging**
