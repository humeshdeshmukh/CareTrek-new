# Health Screen Setup Guide

## Overview

The Health Screen is now fully functional with support for:
- **Real Watch Data**: Connect via BLE to collect metrics from smartwatches
- **Demo Mode**: Generate realistic mock data for testing without a physical device
- **Supabase Integration**: All data is saved to your Supabase database
- **Multiple Health Metrics**: Heart Rate, Steps, Oxygen, Blood Pressure, Calories, Sleep, Hydration

## Database Schema

Your Supabase `health_metrics` table has the following columns:

```sql
- id (UUID) - Primary key
- user_id (UUID) - Foreign key to auth.users
- heart_rate (integer) - BPM
- blood_pressure_systolic (integer) - mmHg
- blood_pressure_diastolic (integer) - mmHg
- blood_oxygen (integer) - % saturation
- temperature (numeric) - Celsius
- steps (integer) - Daily step count
- calories_burned (integer) - kcal
- sleep_duration_minutes (integer) - Minutes
- recorded_at (timestamp) - When measurement was taken
- created_at (timestamp) - Record creation time
- updated_at (timestamp) - Last update time
- battery (integer) - Device battery %
- device_id (UUID) - Device identifier
- device_name (text) - Device name
- rssi (integer) - Signal strength
- device_type (text) - Device type (generic, miband, amazfit, firebolt, demo)
- timestamp (timestamp) - Current timestamp
```

## Using Demo Mode

### Enable Demo Mode

1. Open the Health Dashboard screen
2. Look for the beaker icon (🧪) in the header when demo mode is active
3. To enable demo mode, you need to:
   - Go to the device selection modal
   - Look for a "Demo Mode" option (or enable via settings)

### Generate Demo Data

Once demo mode is enabled, you'll see a demo card with two buttons:

#### **New Data**
- Generates a single data point with realistic mock values
- Saves immediately to Supabase
- Updates the Health Dashboard in real-time

#### **7-Day History**
- Generates 7 days of historical data
- Each day has realistic variations
- Perfect for testing charts and trends
- All data is saved to Supabase

### Demo Data Characteristics

The mock data service generates realistic health metrics:

```
Heart Rate: 50-150 BPM (baseline ~72)
Steps: 0-10,000+ steps (baseline ~5,000)
Calories: 500-2,000+ kcal (baseline ~1,200)
Oxygen: 90-100% (baseline ~98%)
Blood Pressure: 100-160 systolic, 60-100 diastolic
Battery: 0-100% (decreases by ~2% per generation)
Sleep: 6-8 hours
Hydration: 1.5-2.5 liters
```

## Health Metric Screens

Each metric has a dedicated screen with:

### Heart Rate Screen
- Current reading with timestamp
- 7-day trend chart
- Statistics: Average, Maximum, Minimum
- "Measure Now" button to sync from watch

### Steps Screen
- Current steps with daily goal progress
- Progress bar (goal: 10,000 steps)
- Statistics: Average, Maximum, Total
- "Sync from Watch" button

### Blood Oxygen Screen
- Current SpO2 percentage
- Health status indicator
- 7-day trend
- Normal range: 95-100%

### Blood Pressure Screen
- Systolic/Diastolic readings
- Status indicator (Normal/High/Low)
- 7-day trend chart
- Normal range: 120/80 mmHg

### Calories Screen
- Current calories burned
- Daily goal progress (2,000 kcal)
- 7-day trend
- Activity level indicator

### Sleep Screen
- Sleep duration in hours
- Sleep quality indicator
- Sleep stages (if available)
- 7-day trend

### Hydration Screen
- Water intake in ml
- Daily goal progress (2,000 ml)
- Hydration status
- Recommendations

## Data Flow

### Real Watch Connection
```
Watch (BLE) → useBLEWatch Hook → watchData State
                                    ↓
                            HealthScreen Component
                                    ↓
                        Metric Screens (display)
                                    ↓
                        Sync Button → Supabase
```

### Demo Mode
```
Demo Mode Enabled → mockDataService
                        ↓
                    Generate Mock Data
                        ↓
                    demoModeService
                        ↓
                    Save to Supabase
                        ↓
                    Fetch in Metric Screens
```

## API Integration

### Save Health Metrics
```typescript
import { saveHealthMetrics } from '../../services/healthDataService';

const result = await saveHealthMetrics(userId, watchData);
```

### Get User Metrics
```typescript
import { getUserHealthMetrics } from '../../services/healthDataService';

const metrics = await getUserHealthMetrics(userId, limit = 50);
```

### Get Health Summary
```typescript
import { getHealthSummary } from '../../services/healthDataService';

const summary = await getHealthSummary(userId, days = 7);
// Returns: { averageHeartRate, totalSteps, averageOxygen, latestMetrics }
```

## Demo Mode Services

### mockDataService
Generates realistic mock health data

```typescript
import { mockDataService } from '../../services/mockDataService';

// Generate single data point
const data = mockDataService.generateMockData();

// Generate 7 days of data
const historicalData = mockDataService.generateHistoricalData(7);

// Update base values for progression
mockDataService.updateBaseValues({ heartRate: 75, steps: 6000 });

// Reset to defaults
mockDataService.reset();
```

### demoModeService
Manages demo mode state and Supabase integration

```typescript
import { demoModeService } from '../../services/demoModeService';

// Initialize
await demoModeService.initialize();

// Enable/Disable
await demoModeService.enable();
await demoModeService.disable();

// Check status
const isActive = demoModeService.isActive();

// Generate and save data
const mockData = demoModeService.getMockData();
await demoModeService.saveMockDataToSupabase(userId);

// Generate historical data
await demoModeService.generateHistoricalData(userId, 7);
```

## Testing Workflow

### 1. Enable Demo Mode
- Open Health Dashboard
- Enable demo mode (if not already active)

### 2. Generate Test Data
- Click "New Data" to generate a single data point
- Click "7-Day History" to generate a week of data

### 3. View in Metric Screens
- Navigate to individual metric screens
- Verify data appears in charts and statistics
- Check that trends are displayed correctly

### 4. Verify Supabase
- Check your Supabase dashboard
- Confirm data is saved in `health_metrics` table
- Verify `device_type` is set to "demo"

## Troubleshooting

### Demo Data Not Appearing
1. Ensure demo mode is enabled (beaker icon visible)
2. Check user authentication (must be logged in)
3. Verify Supabase connection
4. Check browser console for errors

### Charts Not Displaying
1. Ensure you have at least 2 data points
2. Check that timestamps are valid
3. Verify metric values are within valid ranges
4. Refresh the screen

### Data Not Saving to Supabase
1. Check user authentication
2. Verify Supabase credentials in `.env`
3. Check Supabase table permissions
4. Review browser console for API errors

## Real Watch Connection

### Supported Devices
- Mi Band (Xiaomi)
- Amazfit
- Firebolt
- Generic BLE devices

### Connection Steps
1. Enable Bluetooth on device
2. Put watch in pairing mode
3. Open Health Dashboard
4. Tap "Connect" button
5. Select device from list
6. Wait for connection (10-20 seconds)

### Troubleshooting Connection
- Ensure Bluetooth is enabled
- Check location services are on (Android requirement)
- Verify app has Bluetooth permissions
- Try disconnecting and reconnecting
- Restart the app if connection fails

## Performance Notes

- Demo data generation is instant
- Supabase saves are async (no blocking)
- Charts render with up to 30 data points
- Historical data queries are paginated (50 items default)
- Background data collection runs every 30 seconds when connected

## Security

- All data is encrypted in transit (HTTPS/TLS)
- User data is isolated by `user_id`
- Device IDs are converted to UUIDs for consistency
- No mock data is stored permanently (can be deleted)
- Demo mode is user-specific

## Next Steps

1. **Test with Real Watch**: Connect an actual smartwatch to verify BLE integration
2. **Customize Thresholds**: Adjust normal ranges for different users
3. **Add Notifications**: Alert users when metrics are out of range
4. **Export Data**: Add CSV/PDF export functionality
5. **Analytics**: Track health trends over time

## Files Modified

- `src/services/healthDataService.ts` - Updated to match Supabase schema
- `src/services/mockDataService.ts` - New mock data generator
- `src/services/demoModeService.ts` - New demo mode manager
- `src/screens/Senior/HealthScreen.tsx` - Added demo mode UI and controls
- Individual metric screens - Already compatible with new schema

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review Supabase logs for database errors
3. Verify all environment variables are set
4. Check that user is authenticated
5. Ensure Supabase table exists with correct schema
