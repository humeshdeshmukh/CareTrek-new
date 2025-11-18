# Action Plan - Implementation Steps

**Date**: November 18, 2025
**Objective**: Fix app crashes and make all screens fully functional
**Estimated Time**: 45 minutes
**Difficulty**: Medium

---

## Phase 1: Preparation (5 minutes)

### Step 1.1: Review Documentation
- Read `CRASH_FIX_AND_STABILITY.md`
- Read `SCREENS_STABILITY_IMPROVEMENTS.md`
- Understand the root causes

### Step 1.2: Backup Current Code
```bash
# Optional: Create a backup branch
git checkout -b feature/stability-improvements
```

### Step 1.3: Prepare Files
- Open all 7 screen files in your editor
- Have `demoModeService.ts` open for reference

---

## Phase 2: Add Imports (5 minutes)

### For Each Screen File:

Add at the top with other imports:
```typescript
import { demoModeService } from '../../../services/demoModeService';
```

**Files to Update**:
1. `HeartRateScreen.tsx`
2. `StepsScreen.tsx`
3. `OxygenScreen.tsx`
4. `BloodPressureScreen.tsx`
5. `CaloriesScreen.tsx`
6. `SleepScreen.tsx`
7. `HydrationScreen.tsx`

---

## Phase 3: Add State Variables (5 minutes)

### For Each Screen File:

Add after existing useState declarations:
```typescript
const [isDemoMode, setIsDemoMode] = useState(false);
const [demoData, setDemoData] = useState<any>(null);
const [cacheKey, setCacheKey] = useState(0);
```

---

## Phase 4: Add Demo Mode Check (5 minutes)

### For Each Screen File:

Add new useEffect hook:
```typescript
useEffect(() => {
  const checkDemo = async () => {
    try {
      const isActive = demoModeService.isActive();
      setIsDemoMode(isActive);
      if (isActive) {
        const data = demoModeService.getMockData();
        setDemoData(data);
      }
    } catch (error) {
      console.warn('Demo mode check error:', error);
    }
  };
  checkDemo();
}, []);
```

---

## Phase 5: Update Display Logic (10 minutes)

### HeartRateScreen.tsx

Find this line:
```typescript
const currentHeartRate = watchData.heartRate || metrics[0]?.heart_rate || 0;
```

Replace with:
```typescript
const currentHeartRate = isDemoMode && demoData 
  ? demoData.heartRate 
  : watchData.heartRate || metrics[0]?.heart_rate || 0;
```

### StepsScreen.tsx

Find this line:
```typescript
const currentSteps = watchData.steps || metrics[0]?.steps || 0;
```

Replace with:
```typescript
const currentSteps = isDemoMode && demoData 
  ? demoData.steps 
  : watchData.steps || metrics[0]?.steps || 0;
```

### OxygenScreen.tsx

Find this line:
```typescript
const currentOxygen = watchData.oxygenSaturation || metrics[0]?.blood_oxygen || 0;
```

Replace with:
```typescript
const currentOxygen = isDemoMode && demoData 
  ? demoData.oxygenSaturation 
  : watchData.oxygenSaturation || metrics[0]?.blood_oxygen || 0;
```

### BloodPressureScreen.tsx

Find these lines:
```typescript
const currentSystolic = watchData.bloodPressure?.systolic || metrics[0]?.blood_pressure_systolic || 0;
const currentDiastolic = watchData.bloodPressure?.diastolic || metrics[0]?.blood_pressure_diastolic || 0;
```

Replace with:
```typescript
const currentSystolic = isDemoMode && demoData 
  ? demoData.bloodPressure.systolic 
  : watchData.bloodPressure?.systolic || metrics[0]?.blood_pressure_systolic || 0;

const currentDiastolic = isDemoMode && demoData 
  ? demoData.bloodPressure.diastolic 
  : watchData.bloodPressure?.diastolic || metrics[0]?.blood_pressure_diastolic || 0;
```

### CaloriesScreen.tsx

Find this line:
```typescript
const currentCalories = watchData.calories || metrics[0]?.calories_burned || 0;
```

Replace with:
```typescript
const currentCalories = isDemoMode && demoData 
  ? demoData.calories 
  : watchData.calories || metrics[0]?.calories_burned || 0;
```

### SleepScreen.tsx

Find this line:
```typescript
const latestRecord = records[0];
```

Replace with:
```typescript
const latestRecord = isDemoMode && demoData?.sleepData
  ? {
      duration: demoData.sleepData.duration,
      quality: demoData.sleepData.quality,
      deep_sleep: Math.floor(demoData.sleepData.duration * 0.2),
      light_sleep: Math.floor(demoData.sleepData.duration * 0.5),
      rem_sleep: Math.floor(demoData.sleepData.duration * 0.2),
      awake_time: Math.floor(demoData.sleepData.duration * 0.1),
    }
  : records[0];
```

### HydrationScreen.tsx

Find this line:
```typescript
const goalProgress = todayRecord
  ? Math.min((todayRecord.water_intake / todayRecord.goal) * 100, 100)
  : 0;
```

Update to handle demo data:
```typescript
const displayTodayRecord = isDemoMode && demoData?.hydration
  ? {
      water_intake: demoData.hydration.waterIntake,
      goal: 2000,
    }
  : todayRecord;

const goalProgress = displayTodayRecord
  ? Math.min((displayTodayRecord.water_intake / displayTodayRecord.goal) * 100, 100)
  : 0;
```

---

## Phase 6: Add Cache Invalidation (5 minutes)

### For Each Screen File:

Find the `onRefresh` function and update it:

```typescript
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await syncDeviceData();
    await loadMetrics();
    setCacheKey(prev => prev + 1);  // Add this line
  } finally {
    setRefreshing(false);
  }
}, [syncDeviceData, loadMetrics]);
```

---

## Phase 7: Testing (10 minutes)

### Test Each Screen:

1. **Enable Demo Mode**
   - Open Health Dashboard
   - Look for beaker icon (🧪)
   - Click "New Data"

2. **Test Heart Rate Screen**
   - Navigate to Heart Rate
   - Verify demo data shows
   - Pull to refresh
   - Verify new data shows

3. **Test Steps Screen**
   - Navigate to Steps
   - Verify demo data shows
   - Check progress bar updates
   - Pull to refresh

4. **Test Oxygen Screen**
   - Navigate to Oxygen
   - Verify demo data shows
   - Check status indicator
   - Pull to refresh

5. **Test Blood Pressure Screen**
   - Navigate to Blood Pressure
   - Verify demo data shows
   - Check both values
   - Pull to refresh

6. **Test Calories Screen**
   - Navigate to Calories
   - Verify demo data shows
   - Check progress bar
   - Pull to refresh

7. **Test Sleep Screen**
   - Navigate to Sleep
   - Verify demo data shows
   - Check breakdown
   - Pull to refresh

8. **Test Hydration Screen**
   - Navigate to Hydration
   - Verify demo data shows
   - Add water
   - Pull to refresh

---

## Phase 8: Stability Testing (5 minutes)

### Connection Testing
```
1. Connect device
2. Keep connected for 5 minutes
3. Check for crashes
4. Disconnect
5. Reconnect
6. Check for crashes
```

### Memory Testing
```
1. Open each screen
2. Refresh multiple times
3. Monitor memory usage
4. Check for leaks
```

### Error Testing
```
1. Disconnect device during use
2. Refresh without data
3. Check error handling
4. Verify no crashes
```

---

## Verification Checklist

### Code Changes
- [ ] All 7 screens have demo mode imports
- [ ] All 7 screens have state variables
- [ ] All 7 screens have demo mode check
- [ ] All 7 screens use demo data in display
- [ ] All 7 screens have cache invalidation

### Functionality
- [ ] Demo data displays in Heart Rate
- [ ] Demo data displays in Steps
- [ ] Demo data displays in Oxygen
- [ ] Demo data displays in Blood Pressure
- [ ] Demo data displays in Calories
- [ ] Demo data displays in Sleep
- [ ] Demo data displays in Hydration

### Stability
- [ ] No crashes on connection
- [ ] No crashes on disconnect
- [ ] No crashes on refresh
- [ ] No crashes after 10 minutes
- [ ] No memory leaks

### Performance
- [ ] Screens load in < 1 second
- [ ] Refresh completes in < 500ms
- [ ] Charts render smoothly
- [ ] No lag or stuttering

---

## Rollback Plan

If issues occur:

```bash
# Revert changes
git checkout -- src/screens/Senior/HealthMetrics/

# Or restore from backup
git checkout feature/stability-improvements~1
```

---

## Success Criteria

✅ All 7 screens show demo data
✅ All screens refresh without crash
✅ No memory leaks detected
✅ Performance is smooth
✅ Data displays correctly
✅ Error handling works

---

## Deployment

### Before Deploying:
1. Run all tests
2. Check console for errors
3. Verify memory usage
4. Test on multiple devices
5. Get team approval

### Deployment Steps:
```bash
# Commit changes
git add .
git commit -m "feat: Fix app crashes and add demo mode support to all screens"

# Push to repository
git push origin feature/stability-improvements

# Create pull request
# Get code review
# Merge to main
# Deploy to production
```

---

## Post-Deployment

### Monitor:
- [ ] Check crash reports
- [ ] Monitor memory usage
- [ ] Gather user feedback
- [ ] Track performance metrics

### Follow-up:
- [ ] Fix any reported issues
- [ ] Optimize performance
- [ ] Add additional features
- [ ] Plan next improvements

---

## Support

### If You Get Stuck:

1. **Demo mode not showing**
   - Check `demoModeService.isActive()` returns true
   - Verify `demoData` state is set
   - Check display logic uses `isDemoMode`

2. **Crashes still occurring**
   - Check all cleanup code is in place
   - Verify error handling is working
   - Check console for specific errors

3. **Stale data showing**
   - Verify cache invalidation is working
   - Check `setCacheKey` is being called
   - Ensure `loadMetrics` completes

4. **Memory leaks**
   - Check all useEffect cleanups
   - Verify all subscriptions are cancelled
   - Check for state updates after unmount

---

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Preparation | 5 min | ⏳ |
| Add Imports | 5 min | ⏳ |
| Add State | 5 min | ⏳ |
| Demo Check | 5 min | ⏳ |
| Display Logic | 10 min | ⏳ |
| Cache Invalidation | 5 min | ⏳ |
| Testing | 10 min | ⏳ |
| **Total** | **45 min** | ⏳ |

---

## Final Notes

- Follow the steps in order
- Test each screen after updates
- Don't skip the testing phase
- Monitor for issues after deployment
- Keep documentation updated

---

**Ready to implement?** Start with Phase 1! 🚀

**Last Updated**: November 18, 2025, 4:06 PM UTC+05:30
**Status**: Ready for Implementation
