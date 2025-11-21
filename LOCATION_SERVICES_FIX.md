# Location Services Fix for BLE Scanning

## Problem
App shows error: `[BleError: Location services are disabled]` and cannot scan for Bluetooth devices.

## Root Cause
On Android 6.0+, Bluetooth scanning requires location services to be enabled, even though it doesn't actually use location data. This is a security measure.

## Solution Implemented

### 1. Location Services Check
Added automatic check before scanning:
```typescript
const checkLocationServicesEnabled = useCallback(async () => {
  if (Platform.OS === 'android') {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  }
  return true;
}, []);
```

### 2. User Prompt
If location services are disabled, user sees:
```
┌─────────────────────────────────────┐
│ Location Services Disabled          │
│                                     │
│ Please enable location services     │
│ in your device settings to scan     │
│ for Bluetooth devices.              │
│                                     │
│  [Cancel]  [Open Settings]          │
└─────────────────────────────────────┘
```

### 3. Error Handling
If scan fails due to location services, app detects and shows alert:
```
┌─────────────────────────────────────┐
│ Location Services Required          │
│                                     │
│ Bluetooth scanning requires         │
│ location services to be enabled.    │
│ Please enable it in your device     │
│ settings.                           │
│                                     │
│  [Cancel]  [Open Settings]          │
└─────────────────────────────────────┘
```

## How to Enable Location Services

### On Android Device:
1. Open **Settings**
2. Go to **Location** (or **Privacy**)
3. Toggle **Location** to **ON**
4. Return to app and tap **Scan**

### Console Output:
```
[BLE-V2] Location services enabled: true
[BLE-V2] Starting scan
[BLE-V2] Device found: FB BSW053
```

## Files Modified

### `src/hooks/useBLEWatchV2.ts`
- Added `expo-location` import
- Added `checkLocationServicesEnabled()` function
- Updated `requestLocationPermission()` to check location services
- Updated scan error handler to detect location services errors
- Shows user-friendly alerts

## Testing Steps

1. **Disable Location Services**
   - Go to Settings → Location → Turn OFF
   - Return to app

2. **Tap Scan Button**
   - Should see: "Location Services Disabled" alert
   - Tap "Open Settings"

3. **Enable Location Services**
   - In Settings, toggle Location to ON
   - Return to app

4. **Tap Scan Again**
   - Should now scan and find devices
   - Console shows: `[BLE-V2] Location services enabled: true`

## Permissions Required

### Android Manifest (already configured):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

### Runtime Permissions (handled by app):
- Location permission (requested)
- Bluetooth permissions (requested)

## Why Location Services?

Android requires location services for Bluetooth scanning because:
1. Bluetooth MAC addresses can be used to determine location
2. This is a privacy/security measure
3. Doesn't actually track location
4. Required on Android 6.0+

## Troubleshooting

### Still getting location error?
1. Restart device
2. Go to Settings → Apps → CareTrek → Permissions → Location → Allow
3. Go to Settings → Location → Turn ON
4. Restart app

### Scan still not finding devices?
1. Make sure Bluetooth is ON
2. Make sure watch is in pairing mode
3. Make sure watch is within range (10 meters)
4. Try restarting both devices

### App crashes on scan?
- Should not happen - all errors are caught
- Check console for error messages
- Report with full console output

## Console Logs

### Successful scan:
```
[BLE-V2] Location services enabled: true
[BLE-V2] Starting scan
[BLE-V2] Device found: FB BSW053
[BLE-V2] Device found: Mi Band 5
```

### Location services disabled:
```
[BLE-V2] Location services enabled: false
[BLE-V2] Location services are disabled
```

### Permission denied:
```
[BLE-V2] Error checking/requesting permissions: Permission denied
```

## Next Steps

1. **Build and run**
   ```bash
   npm run android
   ```

2. **Enable location services**
   - Settings → Location → ON

3. **Tap Scan**
   - Should find devices

4. **Connect to watch**
   - Select device from list
   - Should connect successfully

## Status
✅ Location services check implemented
✅ User prompts added
✅ Error handling improved
✅ Ready for testing
