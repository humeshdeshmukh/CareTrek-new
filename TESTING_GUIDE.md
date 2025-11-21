# Testing Guide - Robust BLE Connection

## Pre-Testing Setup

1. **Clear app cache and data**
   ```bash
   adb shell pm clear com.yourapp.name
   ```

2. **Rebuild the app**
   ```bash
   npm run android
   ```

3. **Open console/logcat**
   ```bash
   adb logcat | grep BLE
   ```

## Test 1: Basic Connection (5 minutes)

### Steps:
1. Open app
2. Go to Health Screen
3. Tap "Scan for Devices"
4. Wait 10 seconds
5. Tap on your smartwatch device
6. Watch console logs

### Expected Output:
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
```

### Success Criteria:
- ✓ All 8 steps complete
- ✓ No error messages
- ✓ UI shows "Connected"
- ✓ No app crash

---

## Test 2: Data Display (5 minutes)

### Steps:
1. After connection, wait 10 seconds
2. Check if heart rate appears on screen
3. Check if SpO2 appears on screen
4. Watch for data updates every 1-2 seconds

### Expected Output:
```
[BLE-V2] [HR] Received: 75
[BLE-V2] [SpO2] Received: 98
[BLE-V2] [HR] Received: 76
[BLE-V2] [SpO2] Received: 97
```

### Success Criteria:
- ✓ Heart rate displays (e.g., "75 BPM")
- ✓ SpO2 displays (e.g., "98%")
- ✓ Data updates every 1-2 seconds
- ✓ No crashes
- ✓ UI is responsive

---

## Test 3: Long Duration (10 minutes)

### Steps:
1. Connect to smartwatch
2. Let it run for 10 minutes
3. Monitor console for errors
4. Check if data continues flowing
5. Check if app stays responsive

### Expected Behavior:
- ✓ Data updates continuously
- ✓ No memory leaks
- ✓ No crashes
- ✓ Battery usage is normal
- ✓ UI remains responsive

### Watch For:
- ✗ Repeated error messages
- ✗ Memory usage increasing
- ✗ Data updates slowing down
- ✗ UI becoming unresponsive

---

## Test 4: Disconnect & Reconnect (5 minutes)

### Steps:
1. Connect to smartwatch
2. Wait for data to display
3. Tap "Disconnect"
4. Wait 2 seconds
5. Tap "Connect" again
6. Select same device

### Expected Output:
```
[BLE-V2] Disconnecting...
[BLE-V2] ===== CONNECTION START =====
[BLE-V2] [STEP 1] ✓ Device connected successfully
...
[BLE-V2] ===== CONNECTION SUCCESS =====
```

### Success Criteria:
- ✓ Disconnect completes smoothly
- ✓ Reconnection works
- ✓ Data displays again
- ✓ No crashes

---

## Test 5: App Close & Reopen (5 minutes)

### Steps:
1. Connect to smartwatch
2. Wait for data to display
3. Close app completely
4. Wait 5 seconds
5. Reopen app
6. Go to Health Screen

### Expected Behavior:
- ✓ App opens without crash
- ✓ Previous data is visible
- ✓ Can reconnect to watch
- ✓ Data resumes flowing

### Watch For:
- ✗ App crash on open
- ✗ Data loss
- ✗ Connection fails
- ✗ UI errors

---

## Test 6: Error Handling (5 minutes)

### Steps:
1. Connect to smartwatch
2. Move watch far away (out of range)
3. Wait for connection to drop
4. Move watch back in range
5. Check if auto-reconnect works

### Expected Behavior:
- ✓ Connection drops gracefully
- ✓ Error message appears
- ✓ No app crash
- ✓ Can reconnect manually

---

## Troubleshooting

### If Connection Fails:

**Check Console For:**
```
[BLE-V2] [STEP 1] ✗ Connection failed: [error message]
```

**Solutions:**
- Ensure Bluetooth is enabled
- Ensure location permission is granted
- Try restarting watch
- Try restarting phone
- Try different watch model

---

### If Data Doesn't Display:

**Check Console For:**
```
[BLE-V2] [HR] Received: 75
[BLE-V2] [SpO2] Received: 98
```

**If Logs Show Data But UI Doesn't:**
- Check HealthScreen.tsx UI rendering
- Verify watchData state is updating
- Check for UI component errors

**If Logs Don't Show Data:**
- Watch may not be sending data
- Characteristic UUIDs may be wrong
- Try different watch model

---

### If App Crashes:

**Check Console For:**
```
[BLE-V2] [HR] Callback error: [error message]
[BLE-V2] [SpO2] Callback error: [error message]
```

**Solutions:**
- Share the exact error message
- Check if error is in parsing or state update
- Try with different watch model
- Check Android version compatibility

---

## Console Log Levels

### Info (✓ Normal):
```
[BLE-V2] [STEP X] ✓ ...
[BLE-V2] [HR] Received: 75
```

### Warning (⚠ Check):
```
[BLE-V2] [STEP X] ⚠ ...
[BLE-V2] Component unmounted, aborting connection
```

### Error (✗ Problem):
```
[BLE-V2] [STEP 1] ✗ Connection failed: ...
[BLE-V2] [HR] Callback error: ...
```

---

## Performance Metrics

### Good Performance:
- Connection: 5-10 seconds
- Data latency: <100ms
- Memory: Stable
- Battery: Normal drain

### Poor Performance:
- Connection: >20 seconds
- Data latency: >1 second
- Memory: Increasing
- Battery: Rapid drain

---

## Success Indicators

✓ All tests pass
✓ No error messages in console
✓ Data displays immediately
✓ App doesn't crash
✓ Data updates continuously
✓ Disconnect/reconnect works
✓ App close/reopen works
✓ Performance is good

---

## Next Steps

1. Run all 6 tests
2. Share console output if issues occur
3. Note any error messages
4. Verify watch compatibility
5. Test with different watch model if needed
