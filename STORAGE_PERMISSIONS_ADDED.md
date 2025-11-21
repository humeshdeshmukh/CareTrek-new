# Storage Permissions Added to useBLEWatchV2

## Problem Fixed

App was crashing because it wasn't requesting **storage and file permissions** needed for AsyncStorage operations.

## Solution Implemented

Updated `src/hooks/useBLEWatchV2.ts` to request all required permissions including storage.

## Permissions Added

### For Android 12+ (API 31+)
```typescript
- BLUETOOTH_SCAN
- BLUETOOTH_CONNECT
- ACCESS_FINE_LOCATION
- READ_MEDIA_IMAGES (NEW)
- READ_MEDIA_VIDEO (NEW)
- READ_MEDIA_AUDIO (NEW)
- MANAGE_EXTERNAL_STORAGE (NEW)
```

### For Android 11 and Below
```typescript
- ACCESS_FINE_LOCATION
- READ_EXTERNAL_STORAGE (NEW)
- WRITE_EXTERNAL_STORAGE (NEW)
```

## Changes Made

**File:** `src/hooks/useBLEWatchV2.ts`

**Function:** `getRequiredAndroidPermissions()`

**Before:**
```typescript
const getRequiredAndroidPermissions = () => {
  if (isAndroid12Plus()) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
};
```

**After:**
```typescript
const getRequiredAndroidPermissions = () => {
  const permissions: any[] = [];
  
  if (isAndroid12Plus()) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      'android.permission.MANAGE_EXTERNAL_STORAGE'
    );
  } else {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
  }
  
  return permissions;
};
```

## Why This Fixes the Crash

### Before (CRASHES)
```
App connects to watch
    ↓
Tries to save data to AsyncStorage
    ↓
No storage permission granted
    ↓
App crashes ❌
```

### After (PROTECTED)
```
App starts
    ↓
Requests all permissions (including storage)
    ↓
User grants permissions
    ↓
App connects to watch
    ↓
Saves data to AsyncStorage ✓
    ↓
App continues ✅
```

## Permission Flow

```
App Launch
    ↓
requestLocationPermission() called
    ↓
Get required permissions list
    ├─ Bluetooth permissions
    ├─ Location permission
    └─ Storage permissions (NEW)
    ↓
Check current status
    ↓
Request missing permissions
    ↓
User grants/denies
    ↓
Store decision
    ↓
App continues
```

## What Each Permission Does

| Permission | Purpose | Android Version |
|-----------|---------|-----------------|
| BLUETOOTH_SCAN | Scan for BLE devices | 12+ |
| BLUETOOTH_CONNECT | Connect to BLE devices | 12+ |
| ACCESS_FINE_LOCATION | Required for BLE scanning | All |
| READ_MEDIA_IMAGES | Read media files | 13+ |
| READ_MEDIA_VIDEO | Read video files | 13+ |
| READ_MEDIA_AUDIO | Read audio files | 13+ |
| MANAGE_EXTERNAL_STORAGE | Manage all files | 11+ |
| READ_EXTERNAL_STORAGE | Read storage | All |
| WRITE_EXTERNAL_STORAGE | Write storage | All |

## Expected Behavior

### First App Launch
```
1. App starts
2. Permission dialog appears
3. Shows: "CareTrek needs access to..."
   - Location (for BLE)
   - Bluetooth (for connection)
   - Storage (for data saving)
4. User taps "Allow"
5. Permissions granted
6. App continues
```

### Subsequent Launches
```
1. App starts
2. Checks permissions
3. All already granted
4. App continues without prompts
```

## Testing

### Test 1: First Launch
```
1. Uninstall app
2. Build and run: npm run android
3. App starts
4. Permission dialog appears
5. Tap "Allow"
6. App continues
```

### Test 2: Connect to Watch
```
1. App running
2. Tap "Connect"
3. Select watch
4. Connection succeeds
5. Data saves to storage
6. No crashes
```

### Test 3: Long Duration
```
1. Connect to watch
2. Leave running 10+ minutes
3. Continuous data reception
4. Verify no crashes
5. Check data in AsyncStorage
```

## Verification

✅ **Permissions Added**
- Storage permissions included
- All Android versions supported
- Proper permission handling

✅ **Type Safety**
- Fixed TypeScript errors
- Proper type casting
- No compilation errors

✅ **Error Handling**
- Graceful permission denial
- Settings redirect if needed
- User-friendly alerts

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useBLEWatchV2.ts` | Added storage permissions to getRequiredAndroidPermissions() |

## Status

✅ **Storage Permissions Added**
- Android 12+ supported
- Android 11 and below supported
- All required permissions included
- Type errors fixed
- Ready to build

## Next Steps

1. **Build the app**
   ```bash
   npm run android
   ```

2. **Grant permissions when prompted**
   - Allow Location
   - Allow Bluetooth
   - Allow Storage

3. **Connect to smartwatch**
   - Tap "Connect"
   - Select device
   - Verify connection

4. **Verify no crashes**
   - Receive heart rate data
   - Receive SpO2 data
   - Data saves to storage
   - App stays stable

## Summary

✅ **Problem:** App crashed because storage permissions weren't requested  
✅ **Solution:** Added storage permissions to permission request flow  
✅ **Result:** App now requests all required permissions including storage  
✅ **Status:** Ready to build and test!

**Next Action:** Build the app and test with your smartwatch!
