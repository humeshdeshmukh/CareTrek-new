# Health Screen Testing Guide

## Quick Start

### Prerequisites
1. **Physical Android Device** (Android 6.0+)
   - Emulator may not have proper BLE support
2. **Bluetooth Enabled** on device
3. **Location Services Enabled** on device
4. **Location Permission Granted** to the app

### Step 1: Verify Device Settings
```
Settings → Location → Turn ON
Settings → Apps → CareTrek → Permissions → Location → Allow
Settings → Bluetooth → Turn ON
```

### Step 2: Run the App
```bash
npm run android
# or
react-native run-android
```

### Step 3: Test BLE Scanning

#### Test Case 1: Normal Scan
1. Open the app
2. Navigate to Health/BLE screen
3. Tap "Scan for Devices"
4. **Expected**: Device list populates with nearby BLE devices

#### Test Case 2: Location Services Disabled
1. Go to Settings → Location → Turn OFF
2. Return to app
3. Tap "Scan for Devices"
4. **Expected**: Alert appears: "Location Services Required"
5. Tap "Open Settings" → Should navigate to location settings

#### Test Case 3: Location Permission Denied
1. Ensure location services are ON
2. Go to Settings → Apps → CareTrek → Permissions → Location → Deny
3. Return to app
4. Tap "Scan for Devices"
5. **Expected**: Permission request dialog appears
6. If denied, alert appears with "Open Settings" button

#### Test Case 4: App Resume
1. Grant all permissions
2. Start scanning
3. Press home button (minimize app)
4. Wait 5 seconds
5. Reopen app
6. **Expected**: App automatically re-checks permissions

### Step 5: Connect to Device
1. After scanning, tap on a device from the list
2. **Expected**: Device connects and shows health metrics
3. Check console for:
   - Heart rate updates
   - SpO2 readings
   - Battery level
   - Steps count

## Troubleshooting

### Issue: "Location services are disabled" error
**Solution**:
1. Go to Settings → Location
2. Turn ON location services
3. Restart the app

### Issue: Permission request keeps appearing
**Solution**:
1. Go to Settings → Apps → CareTrek → Permissions
2. Grant "Location" permission
3. Restart the app

### Issue: No devices found during scan
**Possible Causes**:
1. No BLE devices nearby
2. Bluetooth is OFF on device
3. Location services are OFF
4. Location permission is not granted

**Solution**:
1. Check Bluetooth is ON
2. Check location services are ON
3. Check location permission is granted
4. Bring BLE device closer to phone
5. Restart the app

### Issue: Device connects but no health data
**Possible Causes**:
1. Device doesn't support required BLE services
2. Device needs to be paired first
3. Characteristic permissions issue

**Solution**:
1. Try connecting to a different device
2. Check device documentation for supported services
3. Check console logs for specific errors

## Console Logs to Check

When troubleshooting, look for these log messages:

```
// Successful scan start
BLE scan started successfully

// Location services check
Location services are disabled
Location services are required for BLE scanning

// Permission check
Location permission not granted
Location permission is required for BLE scanning

// Connection success
Device connected: [device name]

// Health metrics
Heart rate: [value]
SpO2: [value]
Battery: [value]%
```

## Device Compatibility

### Tested Devices
- Mi Band 4/5/6/7
- Amazfit Band 5/7
- Generic BLE devices with Heart Rate Service

### Required BLE Services
- **Heart Rate**: `0000180d-0000-1000-8000-00805f9b34fb`
- **SpO2**: `00001822-0000-1000-8000-00805f9b34fb`
- **Battery**: `0000180f-0000-1000-8000-00805f9b34fb`

## Performance Notes

- Scan timeout: 10 seconds
- Connection timeout: 3 retries with exponential backoff
- Stability filter: Requires 2 consecutive readings for metrics update
- Battery read: Attempted once per connection

## Next Steps

After successful testing:
1. Deploy to production
2. Monitor crash logs
3. Gather user feedback
4. Iterate on UX improvements
