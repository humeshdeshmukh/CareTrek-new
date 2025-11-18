# Complete Testing Guide - All 7 Screens

**Date**: November 18, 2025, 4:33 PM UTC+05:30
**Purpose**: Verify all health screens are working correctly
**Status**: Ready for Testing

---

## Pre-Testing Checklist

- [ ] Applied database migrations
- [ ] Rebuilt APK with latest code
- [ ] Installed APK on Android device
- [ ] Device has Android 10+ (for permission popup)
- [ ] Smartwatch available for testing
- [ ] Internet connection available

---

## Test 1: Permission Popup on App Startup

### Expected Behavior
- Permission popup appears when app opens for first time
- Popup shows "Activity Recognition Permission"
- User can tap "Allow" to grant permission

### Steps
1. Uninstall app completely
2. Reinstall APK
3. Open app
4. **Verify**: Permission popup appears
5. Tap "Allow"
6. **Verify**: Permission granted, app loads

### Pass/Fail
- [ ] Permission popup appears
- [ ] User can grant permission
- [ ] App loads after granting
- [ ] No crashes

---

## Test 2: Demo Mode - HeartRateScreen

### Expected Behavior
- Demo data displays when demo mode enabled
- Shows current, average, max, min heart rate
- Chart displays demo data
- Refresh updates data

### Steps
1. Open Health Dashboard
2. Click beaker icon (🧪) in header
3. Click "New Data" to generate one data point
4. Navigate to HeartRateScreen
5. **Verify**: Demo heart rate displays
6. Pull down to refresh
7. **Verify**: New data loads

### Pass/Fail
- [ ] Demo mode can be enabled
- [ ] Demo data displays
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 3: Demo Mode - StepsScreen

### Expected Behavior
- Demo steps display
- Progress bar shows goal progress
- Chart displays step data
- Refresh updates data

### Steps
1. Enable demo mode (if not already)
2. Navigate to StepsScreen
3. **Verify**: Demo steps display
4. **Verify**: Progress bar shows percentage
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo steps display
- [ ] Progress bar works
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 4: Demo Mode - OxygenScreen

### Expected Behavior
- Demo oxygen saturation displays
- Shows current, average, max, min values
- Chart displays oxygen data
- Status indicator shows health status

### Steps
1. Enable demo mode (if not already)
2. Navigate to OxygenScreen
3. **Verify**: Demo oxygen displays
4. **Verify**: Status indicator shows
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo oxygen displays
- [ ] Status indicator shows
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 5: Demo Mode - BloodPressureScreen

### Expected Behavior
- Demo blood pressure displays (systolic/diastolic)
- Shows BP status (Normal, Elevated, Hypertension)
- Chart displays BP data
- Status color changes based on reading

### Steps
1. Enable demo mode (if not already)
2. Navigate to BloodPressureScreen
3. **Verify**: Demo BP displays
4. **Verify**: Status shows correctly
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo BP displays
- [ ] Status shows correctly
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 6: Demo Mode - CaloriesScreen

### Expected Behavior
- Demo calories display
- Progress bar shows goal progress
- Chart displays calorie data
- Statistics show correctly

### Steps
1. Enable demo mode (if not already)
2. Navigate to CaloriesScreen
3. **Verify**: Demo calories display
4. **Verify**: Progress bar shows percentage
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo calories display
- [ ] Progress bar works
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 7: Demo Mode - SleepScreen

### Expected Behavior
- Demo sleep data displays
- Shows sleep duration and quality
- Sleep breakdown shows (deep, light, REM, awake)
- Chart displays sleep data

### Steps
1. Enable demo mode (if not already)
2. Navigate to SleepScreen
3. **Verify**: Demo sleep data displays
4. **Verify**: Sleep breakdown shows
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo sleep data displays
- [ ] Sleep breakdown shows
- [ ] Chart shows data
- [ ] Refresh works
- [ ] No crashes

---

## Test 8: Demo Mode - HydrationScreen

### Expected Behavior
- Demo water intake displays
- Progress bar shows goal progress
- Water intake history shows
- Can add water entries

### Steps
1. Enable demo mode (if not already)
2. Navigate to HydrationScreen
3. **Verify**: Demo water intake displays
4. **Verify**: Progress bar shows percentage
5. Pull down to refresh
6. **Verify**: New data loads

### Pass/Fail
- [ ] Demo water intake displays
- [ ] Progress bar works
- [ ] History shows
- [ ] Refresh works
- [ ] No crashes

---

## Test 9: Real Watch Data - Connection

### Expected Behavior
- Smartwatch connects via Bluetooth
- Device shows as connected
- Real data starts syncing

### Steps
1. Disable demo mode (click beaker icon again)
2. Connect smartwatch via Bluetooth
3. Open Health Dashboard
4. **Verify**: Device shows as connected
5. **Verify**: Real data displays

### Pass/Fail
- [ ] Watch connects
- [ ] Connection shows
- [ ] Real data displays
- [ ] No crashes

---

## Test 10: Real Watch Data - Sync

### Expected Behavior
- Sync button works
- Data syncs from watch
- New data displays on screen
- No permission errors

### Steps
1. Open StepsScreen
2. Click "Sync from Watch" button
3. **Verify**: Data syncs
4. **Verify**: New data displays
5. **Verify**: No errors
6. Repeat on other screens

### Pass/Fail
- [ ] Sync button works
- [ ] Data syncs successfully
- [ ] New data displays
- [ ] No permission errors
- [ ] No crashes

---

## Test 11: Cache Invalidation

### Expected Behavior
- Refresh loads fresh data
- Cache is properly invalidated
- No stale data shows

### Steps
1. Open any health screen
2. Note current data
3. Pull down to refresh
4. **Verify**: New data loads
5. **Verify**: Data is different (if available)
6. Repeat on all 7 screens

### Pass/Fail
- [ ] Refresh works on all screens
- [ ] Fresh data loads
- [ ] No stale data
- [ ] No crashes

---

## Test 12: Error Handling

### Expected Behavior
- App handles errors gracefully
- User sees error messages
- App doesn't crash

### Steps
1. Disconnect smartwatch
2. Try to sync
3. **Verify**: Error message shows
4. **Verify**: App doesn't crash
5. Tap OK to dismiss error
6. **Verify**: App still works

### Pass/Fail
- [ ] Error message shows
- [ ] App doesn't crash
- [ ] Can dismiss error
- [ ] App recovers

---

## Test 13: Screen Navigation

### Expected Behavior
- Can navigate between all 7 screens
- No crashes when switching
- Data persists correctly

### Steps
1. Open Health Dashboard
2. Navigate to HeartRateScreen
3. Navigate to StepsScreen
4. Navigate to OxygenScreen
5. Navigate to BloodPressureScreen
6. Navigate to CaloriesScreen
7. Navigate to SleepScreen
8. Navigate to HydrationScreen
9. **Verify**: No crashes
10. **Verify**: Data displays correctly

### Pass/Fail
- [ ] Can navigate all screens
- [ ] No crashes
- [ ] Data displays correctly
- [ ] Performance is good

---

## Test 14: Background App

### Expected Behavior
- App works after backgrounding
- Data persists
- No crashes on resume

### Steps
1. Open any health screen
2. Press home button (background app)
3. Wait 10 seconds
4. Tap app to resume
5. **Verify**: App resumes correctly
6. **Verify**: Data still displays
7. **Verify**: No crashes

### Pass/Fail
- [ ] App backgrounds correctly
- [ ] App resumes correctly
- [ ] Data persists
- [ ] No crashes

---

## Test 15: Extended Use

### Expected Behavior
- App remains stable during extended use
- No memory leaks
- No performance degradation

### Steps
1. Open app
2. Navigate through all 7 screens multiple times
3. Refresh each screen multiple times
4. Enable/disable demo mode
5. Connect/disconnect watch
6. Sync multiple times
7. **Verify**: App remains responsive
8. **Verify**: No crashes
9. **Verify**: No lag

### Pass/Fail
- [ ] App remains responsive
- [ ] No crashes
- [ ] No lag
- [ ] No memory issues

---

## Test Results Summary

### Demo Mode Tests
- [ ] HeartRateScreen - PASS/FAIL
- [ ] StepsScreen - PASS/FAIL
- [ ] OxygenScreen - PASS/FAIL
- [ ] BloodPressureScreen - PASS/FAIL
- [ ] CaloriesScreen - PASS/FAIL
- [ ] SleepScreen - PASS/FAIL
- [ ] HydrationScreen - PASS/FAIL

### Real Data Tests
- [ ] Watch Connection - PASS/FAIL
- [ ] Data Sync - PASS/FAIL
- [ ] Cache Invalidation - PASS/FAIL

### Stability Tests
- [ ] Error Handling - PASS/FAIL
- [ ] Screen Navigation - PASS/FAIL
- [ ] Background App - PASS/FAIL
- [ ] Extended Use - PASS/FAIL

---

## Overall Status

### Total Tests: 15
- [ ] Passed: ___
- [ ] Failed: ___
- [ ] Issues Found: ___

### Overall Result
- [ ] PASS - All tests passed, ready for production
- [ ] FAIL - Issues found, needs fixes

---

## Issues Found

### Issue 1
- **Description**: 
- **Severity**: High/Medium/Low
- **Steps to Reproduce**: 
- **Solution**: 

### Issue 2
- **Description**: 
- **Severity**: High/Medium/Low
- **Steps to Reproduce**: 
- **Solution**: 

---

## Notes

```
[Add any additional notes or observations here]
```

---

## Sign-Off

- **Tested By**: _______________
- **Date**: _______________
- **Time**: _______________
- **Device**: _______________
- **Android Version**: _______________
- **App Version**: _______________

---

## Approval

- [ ] QA Approved
- [ ] Ready for Production
- [ ] Needs Fixes

---

**Testing Guide Complete**

**Last Updated**: November 18, 2025, 4:33 PM UTC+05:30

---

**Use this guide to verify all screens are working correctly before deployment!** ✅
