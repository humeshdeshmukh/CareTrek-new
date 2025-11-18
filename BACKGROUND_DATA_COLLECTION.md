# Background Data Collection & Persistent Connection

## Overview

This document describes the new background data collection system that keeps your smartwatch connected and automatically collects health metrics even when the app is closed.

## Features

### 1. **Persistent Watch Connection**
- Watch remains connected after app closes
- Connection is maintained in the background
- Automatically reconnects if connection drops
- No manual reconnection needed

### 2. **Automatic Data Collection**
- Collects heart rate, steps, calories, and oxygen levels
- Data collected every 30 seconds
- Readings are aggregated (averaged, min/max calculated)
- Aggregated metrics synced every 5 minutes

### 3. **Crash Prevention**
- All characteristic monitoring wrapped in try-catch blocks
- Unhandled errors in callbacks no longer crash the app
- Graceful error handling and logging
- Automatic recovery from connection errors

### 4. **Data Persistence**
- Collected metrics stored locally in AsyncStorage
- Up to 100 metric collections stored
- Data persists across app restarts
- Manual sync button to upload to database

## Architecture

### Services

#### `backgroundDataService.ts`
Manages the background data collection lifecycle:
- **initialize()** - Start collection timers
- **addHeartRateReading()** - Add HR reading to aggregation
- **addStepsReading()** - Add steps reading
- **addCaloriesReading()** - Add calories reading
- **addOxygenReading()** - Add oxygen reading
- **getStoredMetrics()** - Retrieve all stored metrics
- **clearStoredMetrics()** - Clear stored data
- **stop()** - Stop collection

#### `backgroundSyncService.ts`
Handles syncing aggregated metrics to database:
- **syncBackgroundMetricsToDatabase()** - Upload all stored metrics
- **getLastSyncTime()** - Get when last sync occurred
- **shouldSync()** - Check if sync is needed

### Data Flow

```
Watch Device
    ↓
BLE Characteristic Monitoring
    ↓
Parse Metrics (HR, Steps, Calories, O2)
    ↓
Update UI (watchData)
    ↓
Add to Background Aggregation
    ↓
Every 30s: Collect metrics
    ↓
Every 5min: Calculate averages & store locally
    ↓
Manual Sync: Upload to Supabase
```

## Usage

### Automatic Collection (No User Action Required)

1. **Connect Watch**
   - Open Health Screen
   - Tap "Connect" button
   - Select your watch from the list
   - Wait for connection (10-20 seconds)

2. **Background Collection Starts Automatically**
   - Data collected every 30 seconds
   - Aggregated every 5 minutes
   - Stored locally on device

3. **App Can Be Closed**
   - Watch stays connected
   - Data continues to be collected
   - Metrics stored locally

### Manual Sync to Database

1. **View Pending Metrics**
   - Open Health Screen
   - Look for "Sync X Background Metrics" button
   - Shows number of metric collections pending

2. **Sync to Database**
   - Tap "Sync X Background Metrics" button
   - Metrics uploaded to Supabase
   - Button disappears after successful sync

## Data Storage

### Local Storage (AsyncStorage)
```
Key: 'background_metrics'
Value: Array of StoredMetric objects

StoredMetric {
  timestamp: ISO string
  heartRateAvg: number
  heartRateMin: number
  heartRateMax: number
  stepsTotal: number
  caloriesTotal: number
  oxygenAvg: number
  battery: number
  deviceId: string
  deviceName: string
}
```

### Database (Supabase)
Metrics synced to `health_metrics` table with:
- user_id
- device_id
- device_name
- device_type
- heart_rate (average)
- heart_rate_min
- heart_rate_max
- steps
- calories
- oxygen_saturation (average)
- battery
- timestamp

## Collection Intervals

- **Data Collection**: Every 30 seconds
  - Reads battery level
  - Prepares for aggregation

- **Aggregation**: Every 5 minutes
  - Calculates heart rate average, min, max
  - Gets latest steps and calories
  - Calculates oxygen average
  - Stores to local storage

- **Database Sync**: Manual (user triggered)
  - Upload all pending metrics
  - Clear local storage after successful sync

## Error Handling

### Crash Prevention
All BLE callbacks wrapped in try-catch:
```typescript
subscribeIfNotifiable(svcUuid, charUuid, (characteristic) => {
  try {
    // Process data
  } catch (err) {
    console.error('[BLE] Callback error:', err);
    // App continues running
  }
});
```

### Connection Recovery
- Automatic reconnection on connection loss
- Graceful degradation if device unavailable
- Errors logged but don't crash app

### Sync Error Handling
- Partial sync success reported
- Failed metrics retained for retry
- User notified of sync status

## Troubleshooting

### Watch Disconnects Immediately
1. Check Bluetooth is enabled on phone
2. Ensure watch is in pairing mode
3. Try reconnecting manually
4. Check watch battery level

### No Data Being Collected
1. Verify watch is connected (green indicator)
2. Check if watch supports the metrics
3. Ensure app has Bluetooth permissions
4. Try closing and reopening app

### Sync Fails
1. Check internet connection
2. Verify Supabase is accessible
3. Check user is authenticated
4. Try again in a few moments

### High Battery Drain
- Background collection uses minimal power
- Collection every 30 seconds is efficient
- Sync only happens every 5 minutes
- Consider syncing less frequently if needed

## Configuration

To adjust collection intervals, edit `backgroundDataService.ts`:

```typescript
const COLLECTION_INTERVAL = 30000;  // 30 seconds
const SYNC_INTERVAL = 300000;       // 5 minutes
const MAX_STORED_METRICS = 100;     // Keep last 100 collections
```

## Performance Impact

- **Memory**: ~1-2 MB for 100 metric collections
- **Battery**: Minimal impact (BLE already active)
- **Network**: Only on manual sync
- **Storage**: ~100 KB for 100 collections

## Future Enhancements

- [ ] Automatic sync on WiFi connection
- [ ] Configurable collection intervals
- [ ] Data compression for storage
- [ ] Sync scheduling (e.g., daily at midnight)
- [ ] Offline data encryption
- [ ] Metrics averaging over longer periods

## API Reference

### backgroundDataService

```typescript
// Initialize service
await backgroundDataService.initialize(device, bleManager);

// Add readings
backgroundDataService.addHeartRateReading(72);
backgroundDataService.addStepsReading(1234);
backgroundDataService.addCaloriesReading(150);
backgroundDataService.addOxygenReading(98);

// Get data
const metrics = await backgroundDataService.getStoredMetrics();
const aggregated = backgroundDataService.getAggregatedMetrics();

// Cleanup
backgroundDataService.stop();
await backgroundDataService.clearStoredMetrics();
```

### backgroundSyncService

```typescript
// Sync to database
const result = await syncBackgroundMetricsToDatabase(userId);
// result: { success: boolean, synced: number, failed: number, error?: string }

// Check sync status
const lastSync = await getLastSyncTime();
const needsSync = await shouldSync(30); // 30 minutes interval
```

## Security Considerations

- Data stored locally on device (not encrypted by default)
- Sync requires user authentication
- Device ID converted to UUID for privacy
- No sensitive data logged to console in production

## Support

For issues or questions:
1. Check console logs for error messages
2. Review troubleshooting section above
3. Ensure all permissions are granted
4. Try restarting the app
