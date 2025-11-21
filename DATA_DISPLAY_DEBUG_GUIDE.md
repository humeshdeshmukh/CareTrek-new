# 🔍 Data Display Debug Guide

## Problem: Data Not Displaying on HealthScreen

### 🎯 Debugging Steps

#### Step 1: Check Console Logs
**Build and run the app:**
```bash
npm run android
```

**Open the app and check console for these logs:**

1. **Watch Connection:**
   ```
   [BLE-V2] Device: [Device Name]
   [BLE-V2] Status: Connected and monitoring
   ```

2. **Data Received:**
   ```
   [HealthScreen] watchData received: {
     status: 'connected',
     heartRate: 72,
     steps: 1250,
     calories: 45,
     ...
   }
   ```

3. **Data Merged:**
   ```
   [HealthScreen] displayData updated: {
     status: 'connected',
     heartRate: 72,
     steps: 1250,
     ...
   }
   ```

#### Step 2: Verify Watch Connection

**Check if watch is connected:**
1. Open HealthScreen
2. Look at Device Card at top
3. Should show:
   - Device name (e.g., "FB BSW053")
   - Status: "Connected" (green indicator)
   - Battery level

**If not connected:**
- Tap "Connect Device" button
- Select your watch from the list
- Wait for connection (10-20 seconds)
- Check console for connection logs

#### Step 3: Check Data Flow

**Expected console output:**
```
[HealthScreen] watchData received: {
  status: 'connected',
  heartRate: 72,
  steps: 1250,
  calories: 45,
  oxygenSaturation: 98,
  bloodPressure: { systolic: 120, diastolic: 80 },
  sleepData: { duration: 28800, quality: 'Good' },
  battery: 85,
  deviceName: 'FB BSW053'
}

[HealthScreen] displayData updated: {
  status: 'connected',
  heartRate: 72,
  steps: 1250,
  calories: 45,
  oxygenSaturation: 98,
  bloodPressure: { systolic: 120, diastolic: 80 },
  sleepData: { duration: 28800, quality: 'Good' },
  battery: 85,
  deviceName: 'FB BSW053'
}
```

#### Step 4: Common Issues & Solutions

**Issue 1: Watch Not Connected**
- **Symptom:** Device card shows "Not Connected"
- **Solution:**
  1. Ensure watch is powered on
  2. Ensure Bluetooth is enabled on phone
  3. Tap "Connect Device" button
  4. Select watch from list
  5. Wait for connection

**Issue 2: Data Not Updating**
- **Symptom:** Metrics show "--" (no data)
- **Solution:**
  1. Check console for watchData logs
  2. If watchData is empty:
     - Watch may not be sending data
     - Try disconnecting and reconnecting
     - Restart the app
  3. If watchData has data but displayData doesn't:
     - Check for errors in console
     - Look for "[HealthScreen] Error merging data:" logs

**Issue 3: Partial Data (Some Metrics Show, Some Don't)**
- **Symptom:** Heart Rate shows, but Blood Pressure shows "--"
- **Solution:**
  1. This is normal - watch may not support all metrics
  2. Check which metrics are available:
     - Heart Rate: Usually supported
     - Steps: Usually supported
     - Oxygen: May not be supported
     - Blood Pressure: May not be supported
     - Sleep: May not be supported
  3. Only available metrics will display data

**Issue 4: App Crashes When Displaying Data**
- **Symptom:** App crashes after data appears
- **Solution:**
  1. Check console for crash logs
  2. Look for "Cannot read property" errors
  3. Check if null checking is in place
  4. Verify MetricCard component is handling undefined values

#### Step 5: Manual Testing

**Test 1: Connect Watch**
```
1. Open HealthScreen
2. Tap "Connect Device" button
3. Select your watch
4. Wait for connection
5. Check Device Card shows "Connected"
```

**Test 2: View Metrics**
```
1. Once connected, wait 5-10 seconds
2. Check if metrics display:
   - Heart Rate
   - Steps
   - Oxygen
   - Blood Pressure
   - Calories
   - Sleep
3. If metrics show "--", data not available from watch
```

**Test 3: Tap Metric Cards**
```
1. Tap Heart Rate card → Should show alert with BPM
2. Tap Steps card → Should show alert with steps
3. Tap Oxygen card → Should show alert with O2%
4. Tap Blood Pressure card → Should show alert with BP
5. Tap Calories card → Should show alert with calories
6. Tap Sleep card → Should show alert with duration
```

**Test 4: Refresh Data**
```
1. Tap refresh button (🔄) in header
2. Data should refresh
3. Check console for refresh logs
```

**Test 5: Sync Data**
```
1. Tap "Sync All Data" button
2. Should show loading spinner
3. Data should sync to Supabase
4. Check console for sync logs
```

#### Step 6: Console Log Reference

**Key logs to look for:**

```
// Device connection
[BLE-V2] Device: FB BSW053
[BLE-V2] Status: Connected and monitoring

// Data received from watch
[HealthScreen] watchData received: { ... }

// Data merged and displayed
[HealthScreen] displayData updated: { ... }

// Data refresh
[HealthScreen] Data merged: { ... }

// Sync to Supabase
[BLE-V2] Syncing data to Supabase: { ... }

// Errors
[HealthScreen] Error merging data: ...
[BLE-V2] Connection error: ...
```

### 🛠️ Troubleshooting Checklist

- ✅ Watch is powered on
- ✅ Bluetooth is enabled on phone
- ✅ App has Bluetooth permissions
- ✅ Watch is in pairing mode (if first time)
- ✅ Watch is connected (Device Card shows "Connected")
- ✅ Console shows watchData logs
- ✅ Console shows displayData logs
- ✅ Metrics display on HealthScreen
- ✅ Metric cards show data (not "--")
- ✅ Tapping metrics shows alerts
- ✅ No crashes in console

### 📝 What to Check

**If data is not displaying:**

1. **Check Device Connection:**
   ```
   Device Card should show:
   - Device name (not "Not Connected")
   - Status: "Connected" (green dot)
   - Battery level (e.g., "85%")
   ```

2. **Check Console Logs:**
   ```
   Look for:
   [HealthScreen] watchData received: { heartRate: 72, ... }
   [HealthScreen] displayData updated: { heartRate: 72, ... }
   ```

3. **Check Metrics Display:**
   ```
   Should show:
   - Heart Rate: 72 BPM (or "--" if no data)
   - Steps: 1250 steps (or "--" if no data)
   - Oxygen: 98% (or "--" if no data)
   - Blood Pressure: 120/80 mmHg (or "--" if no data)
   - Calories: 45 kcal (or "--" if no data)
   - Sleep: 8h (or "--" if no data)
   ```

4. **Check for Errors:**
   ```
   Look for error logs:
   [HealthScreen] Error merging data: ...
   [BLE-V2] Connection error: ...
   Cannot read property ...
   ```

---

**Status: 🔍 Debug Guide Ready**

Use this guide to troubleshoot data display issues! Check console logs! Verify watch connection! 🎉
