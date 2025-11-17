# Health Features Implementation Guide

## Overview
This document outlines the new health tracking features added to CareTrek, including detailed metric screens, sleep analysis, and hydration tracking.

## New Features Added

### 1. **Detailed Health Metric Screens**
Each health metric now has its own dedicated screen with:
- Current reading display with status indicators
- 7-day trend charts
- Statistical summaries (average, max, min)
- Real-time sync capability with watch devices
- Measure/Sync buttons to trigger data collection

#### Screens Created:
- **HeartRateScreen** (`src/screens/Senior/HealthMetrics/HeartRateScreen.tsx`)
  - Color: Red (#FF6B6B)
  - Shows current BPM, average, max, min
  - 7-day trend line chart

- **StepsScreen** (`src/screens/Senior/HealthMetrics/StepsScreen.tsx`)
  - Color: Green (#4CAF50)
  - Shows daily goal progress with visual progress bar
  - Integrates with mobile device sensors (Android Activity Recognition)
  - Displays average, maximum, and total steps

- **OxygenScreen** (`src/screens/Senior/HealthMetrics/OxygenScreen.tsx`)
  - Color: Blue (#2196F3)
  - Shows SpO₂ percentage with status (Excellent/Good/Fair/Low)
  - Includes health information card about normal ranges
  - 7-day trend tracking

- **BloodPressureScreen** (`src/screens/Senior/HealthMetrics/BloodPressureScreen.tsx`)
  - Color: Pink (#E91E63)
  - Displays Systolic/Diastolic readings
  - Shows BP status (Normal/Elevated/Stage 1/Stage 2 Hypertension)
  - Dual-line chart for systolic and diastolic trends

- **CaloriesScreen** (`src/screens/Senior/HealthMetrics/CaloriesScreen.tsx`)
  - Color: Orange (#FF9800)
  - Shows daily calorie burn with goal progress
  - Displays average, maximum, and total calories
  - Includes disclaimer about calorie estimation

- **SleepScreen** (`src/screens/Senior/HealthMetrics/SleepScreen.tsx`)
  - Color: Purple (#9C27B0)
  - Shows sleep duration and quality
  - Breaks down sleep into: Deep Sleep, Light Sleep, REM Sleep, Awake Time
  - 7-day bar chart for sleep duration
  - Quality badges with color coding

- **HydrationScreen** (`src/screens/Senior/HealthMetrics/HydrationScreen.tsx`)
  - Color: Light Blue (#2196F3)
  - Shows daily water intake progress with circular progress display
  - Quick-add buttons for common amounts (250ml, 500ml, 750ml, 1000ml)
  - Custom amount modal with beverage type selection
  - Tracks different beverage types: Water, Juice, Tea, Coffee, Milk, Other
  - 7-day statistics and goal achievement rate

### 2. **Sleep Tracking Service**
File: `src/services/sleepTrackingService.ts`

**Features:**
- Save sleep records with detailed breakdown
- Track sleep quality (poor, fair, good, excellent)
- Monitor sleep stages: Deep, Light, REM, and Awake time
- Get sleep summary for specified period
- Retrieve today's sleep record

**Key Functions:**
```typescript
saveSleepRecord(userId, deviceId, sleepData)
getUserSleepRecords(userId, days)
getSleepSummary(userId, days)
getTodaySleepRecord(userId)
```

**Database Table: `sleep_records`**
- user_id, device_id, date
- duration, quality, deep_sleep, light_sleep, rem_sleep, awake_time
- start_time, end_time

### 3. **Hydration Tracking Service**
File: `src/services/hydrationTrackingService.ts`

**Features:**
- Track daily water intake
- Support multiple beverage types
- Log individual hydration entries with timestamps
- Calculate goal achievement rates
- Get hydration summary and statistics

**Key Functions:**
```typescript
saveHydrationRecord(userId, waterIntake, goal)
addHydrationEntry(userId, amount, type)
getTodayHydrationRecord(userId)
getUserHydrationRecords(userId, days)
getHydrationSummary(userId, days)
```

**Database Tables:**
- `hydration_records`: Daily hydration tracking
- `hydration_entries`: Individual beverage entries

### 4. **Mobile Sensor Integration**

#### Steps Tracking:
- Uses Android Activity Recognition API (API 29+)
- Requests `ACTIVITY_RECOGNITION` permission
- Integrates with watch data via BLE
- Falls back to watch data if mobile sensor unavailable

#### Calories Tracking:
- Estimated based on:
  - Activity level (from steps)
  - Heart rate data
  - Duration of activity
- Syncs with watch device data
- Provides daily and historical tracking

### 5. **Enhanced BLE Types**
File: `src/types/ble.ts`

**New Fields Added to WatchData:**
```typescript
sleepData?: {
  duration: number;           // in minutes
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  deepSleep: number;          // in minutes
  lightSleep: number;         // in minutes
  remSleep: number;           // in minutes
  awakeTime: number;          // in minutes
  timestamp: Date;
}

hydration?: {
  waterIntake: number;        // in ml
  goal: number;               // daily goal in ml
  timestamp: Date;
}
```

## Navigation Integration

### New Routes Added to RootNavigator:
```typescript
HeartRate: undefined
Steps: undefined
Oxygen: undefined
BloodPressure: undefined
Calories: undefined
Sleep: undefined
Hydration: undefined
```

### Navigation from HealthScreen:
Each metric card should include a navigation handler:
```typescript
navigation.navigate('HeartRate')
navigation.navigate('Steps')
navigation.navigate('Oxygen')
navigation.navigate('BloodPressure')
navigation.navigate('Calories')
navigation.navigate('Sleep')
navigation.navigate('Hydration')
```

## Database Schema

### New Tables Required:

**1. sleep_records**
```sql
CREATE TABLE sleep_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  date DATE NOT NULL,
  duration INTEGER,
  quality TEXT,
  deep_sleep INTEGER,
  light_sleep INTEGER,
  rem_sleep INTEGER,
  awake_time INTEGER,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**2. hydration_records**
```sql
CREATE TABLE hydration_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  water_intake INTEGER,
  goal INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**3. hydration_entries**
```sql
CREATE TABLE hydration_entries (
  id UUID PRIMARY KEY,
  hydration_record_id UUID NOT NULL,
  amount INTEGER,
  time TEXT,
  type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## UI/UX Features

### Common Elements Across All Screens:
1. **Header** - Back button and title
2. **Current Reading Card** - Large display with icon and status
3. **Statistics Grid** - Average, Max, Min values
4. **7-Day Chart** - Trend visualization
5. **Measure/Sync Button** - Trigger data collection from watch

### Color Coding:
- Heart Rate: Red (#FF6B6B)
- Steps: Green (#4CAF50)
- Oxygen: Blue (#2196F3)
- Blood Pressure: Pink (#E91E63)
- Calories: Orange (#FF9800)
- Sleep: Purple (#9C27B0)
- Hydration: Light Blue (#2196F3)

### Status Indicators:
- **Oxygen**: Excellent (95-100%), Good (90-94%), Fair (85-89%), Low (<85%)
- **Blood Pressure**: Normal, Elevated, Stage 1, Stage 2 Hypertension
- **Sleep Quality**: Poor, Fair, Good, Excellent

## Implementation Steps for HealthScreen

To integrate these new screens into your existing HealthScreen:

1. **Add Navigation Handlers** to metric cards:
```typescript
<TouchableOpacity onPress={() => navigation.navigate('HeartRate')}>
  {/* Card content */}
</TouchableOpacity>
```

2. **Update Metric Display** to show "Tap for details" hint

3. **Add Sync Button** to trigger `syncDeviceData()` from useBLEWatch hook

4. **Display Last Updated** timestamp for each metric

## Permissions Required

### Android Permissions:
```xml
<!-- For steps tracking -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

<!-- For Bluetooth (already required) -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- For location (already required) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Testing Checklist

- [ ] All detail screens navigate correctly from HealthScreen
- [ ] Measure/Sync buttons trigger data collection
- [ ] Charts display 7-day data correctly
- [ ] Statistics calculate accurately
- [ ] Sleep data saves and retrieves properly
- [ ] Hydration entries add and update correctly
- [ ] Mobile sensor permissions requested on Android 29+
- [ ] Dark mode styling works on all screens
- [ ] Refresh control works on all screens
- [ ] Status indicators show correct colors and text

## Future Enhancements

1. **Notifications & Reminders**
   - Sleep schedule reminders
   - Hydration reminders at set intervals
   - Abnormal reading alerts

2. **Advanced Analytics**
   - Correlation between metrics
   - Health trends and predictions
   - Personalized recommendations

3. **Export & Sharing**
   - Export health data as PDF
   - Share reports with healthcare providers
   - Integration with health apps

4. **Wearable Integration**
   - Direct sync with more watch models
   - Real-time notifications from watch
   - Watch app for quick logging

5. **AI-Powered Insights**
   - Health pattern recognition
   - Predictive health alerts
   - Personalized health coaching

## Support & Troubleshooting

### Common Issues:

1. **Sleep/Hydration data not saving**
   - Check database tables exist
   - Verify user authentication
   - Check Supabase connection

2. **Charts not displaying**
   - Ensure data exists for the period
   - Check chart library version compatibility
   - Verify data format matches chart requirements

3. **Permissions not granted**
   - Test on actual device (not emulator)
   - Check Android version (API 29+ for Activity Recognition)
   - Verify manifest permissions

4. **Watch sync not working**
   - Ensure watch is connected
   - Check BLE permissions
   - Verify device ID is captured

## Files Created/Modified

### New Files:
- `src/screens/Senior/HealthMetrics/HeartRateScreen.tsx`
- `src/screens/Senior/HealthMetrics/StepsScreen.tsx`
- `src/screens/Senior/HealthMetrics/OxygenScreen.tsx`
- `src/screens/Senior/HealthMetrics/BloodPressureScreen.tsx`
- `src/screens/Senior/HealthMetrics/CaloriesScreen.tsx`
- `src/screens/Senior/HealthMetrics/SleepScreen.tsx`
- `src/screens/Senior/HealthMetrics/HydrationScreen.tsx`
- `src/services/sleepTrackingService.ts`
- `src/services/hydrationTrackingService.ts`

### Modified Files:
- `src/types/ble.ts` - Added sleep and hydration data types
- `src/navigation/RootNavigator.tsx` - Added new screen routes

## Next Steps

1. Create database migrations for new tables
2. Update HealthScreen to include navigation links
3. Add measure/sync buttons to HealthScreen
4. Test all screens with real device data
5. Implement notifications and reminders
6. Add export functionality
