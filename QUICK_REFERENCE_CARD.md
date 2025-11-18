# Quick Reference Card - Health Screens

## 🎯 What's Working

| Feature | Status | Location |
|---------|--------|----------|
| Heart Rate Screen | ✅ | `HealthMetrics/HeartRateScreen.tsx` |
| Steps Screen | ✅ | `HealthMetrics/StepsScreen.tsx` |
| Oxygen Screen | ✅ FIXED | `HealthMetrics/OxygenScreen.tsx` |
| Blood Pressure Screen | ✅ | `HealthMetrics/BloodPressureScreen.tsx` |
| Calories Screen | ✅ FIXED | `HealthMetrics/CaloriesScreen.tsx` |
| Sleep Screen | ✅ | `HealthMetrics/SleepScreen.tsx` |
| Hydration Screen | ✅ | `HealthMetrics/HydrationScreen.tsx` |
| Demo Mode | ✅ | `HealthScreen.tsx` |

---

## 🚀 Quick Start

### Enable Demo Mode
1. Open Health Dashboard
2. Look for beaker icon (🧪)
3. Click "New Data" or "7-Day History"
4. View in any metric screen

### Connect Real Watch
1. Enable Bluetooth on watch
2. Put watch in pairing mode
3. Tap "Connect" on Health Dashboard
4. Select your watch
5. Data syncs automatically

---

## 📊 Screen Overview

### Heart Rate
- **Current**: Live reading from watch or latest database
- **Chart**: 7-day trend
- **Stats**: Average, Max, Min (BPM)
- **Action**: "Measure Now" button

### Steps
- **Current**: Daily step count
- **Progress**: Goal bar (10,000 steps)
- **Stats**: Average, Max, Total
- **Action**: "Sync from Watch" button

### Oxygen
- **Current**: SpO2 percentage
- **Status**: Excellent/Good/Fair/Low
- **Chart**: 7-day trend
- **Stats**: Average, Max, Min (%)
- **Action**: "Measure Now" button

### Blood Pressure
- **Current**: Systolic/Diastolic (mmHg)
- **Status**: Normal/Elevated/Stage 1/Stage 2
- **Chart**: 7-day trend (both values)
- **Stats**: Avg Systolic, Avg Diastolic
- **Action**: "Measure Now" button

### Calories
- **Current**: Calories burned today
- **Progress**: Goal bar (2,000 kcal)
- **Stats**: Average, Max, Total
- **Action**: "Sync from Watch" button

### Sleep
- **Last Night**: Duration + Quality
- **Breakdown**: Deep, Light, REM, Awake
- **Chart**: 7-day duration
- **Stats**: Avg Duration, Avg Quality, Nights
- **Action**: "Sync Sleep Data" button

### Hydration
- **Today**: Water intake progress
- **Progress**: Goal bar (2,000 ml)
- **Quick Add**: 250, 500, 750, 1000 ml buttons
- **Custom**: Add any amount
- **Stats**: Avg Daily, Goal Achievement, Days Tracked

---

## 🔧 Column Names (Database)

```
✅ heart_rate
✅ steps
✅ blood_oxygen (was: oxygen_saturation) - FIXED
✅ blood_pressure_systolic
✅ blood_pressure_diastolic
✅ calories_burned (was: calories) - FIXED
✅ battery
✅ device_id
✅ device_name
✅ timestamp
```

---

## 📱 Demo Mode

### Generate Data
- **New Data**: Single data point
- **7-Day History**: Full week of data
- **Saved To**: Supabase health_metrics table
- **Device Type**: "demo"

### Disable Demo Mode
- Click beaker icon (🧪) in header
- Switch to real watch data

---

## 🐛 Fixed Issues

### OxygenScreen.tsx
```typescript
// Column: blood_oxygen (not oxygen_saturation)
const oxygenData = data.filter(m => m.blood_oxygen).slice(0, 7);
```

### CaloriesScreen.tsx
```typescript
// Column: calories_burned (not calories)
const caloriesData = data.filter(m => m.calories_burned).slice(0, 7);
```

---

## 📋 Data Flow

```
User Opens Screen
    ↓
Get User ID from Auth
    ↓
Query Supabase (last 30 records)
    ↓
Filter Valid Data (last 7 days)
    ↓
Calculate Statistics
    ↓
Display Chart + Stats
    ↓
Show Current Reading
    ↓
Ready for Refresh/Sync
```

---

## ✨ Features

- ✅ Real-time data from watch
- ✅ 7-day trend charts
- ✅ Statistical calculations
- ✅ Status indicators
- ✅ Progress bars for goals
- ✅ Pull-to-refresh
- ✅ Dark/Light theme
- ✅ Demo mode for testing
- ✅ Error handling
- ✅ Loading states

---

## 🎨 Colors Used

| Metric | Color | Hex |
|--------|-------|-----|
| Heart Rate | Red | #FF6B6B |
| Steps | Green | #4CAF50 |
| Oxygen | Blue | #2196F3 |
| Blood Pressure | Pink | #E91E63 |
| Calories | Orange | #FF9800 |
| Sleep | Purple | #9C27B0 |
| Hydration | Blue | #2196F3 |

---

## 📞 Common Actions

| Action | How To |
|--------|--------|
| View metric details | Tap metric card on Health Dashboard |
| Refresh data | Pull down on any screen |
| Sync from watch | Tap "Measure Now" or "Sync" button |
| Add water | Tap quick add button or "Add Custom" |
| Enable demo mode | Tap beaker icon (🧪) |
| Disable demo mode | Tap beaker icon (🧪) again |

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| No data showing | Generate data using "New Data" or "7-Day History" |
| Chart not displaying | Need at least 2 data points |
| Watch not connecting | Check Bluetooth, location services, permissions |
| Demo mode errors | Refresh app, ensure logged in |
| Slow loading | Check internet connection, Supabase status |

---

## 📚 Documentation

- `HEALTH_SCREEN_SETUP_GUIDE.md` - Full setup guide
- `DEMO_MODE_QUICK_START.md` - Demo mode reference
- `DATABASE_SCHEMA_INFO.md` - Database details
- `DEVELOPER_REFERENCE.md` - Developer guide
- `HEALTH_SCREENS_FUNCTIONAL.md` - Screen details
- `FINAL_VERIFICATION.md` - Verification report

---

## ✅ Status

**All Screens**: Fully Functional ✅
**Demo Mode**: Working ✅
**Real Watch**: Connected ✅
**Database**: Synced ✅
**Production Ready**: YES ✅

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Status**: Production Ready
