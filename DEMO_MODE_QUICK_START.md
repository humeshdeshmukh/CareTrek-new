# Demo Mode Quick Start

## What is Demo Mode?

Demo Mode generates realistic mock health data for testing the Health Dashboard without needing a physical smartwatch.

## Quick Steps

### 1. Open Health Dashboard
- Navigate to the Health screen in the app
- You should see "Health Dashboard" at the top

### 2. Enable Demo Mode
- Look at the top-right corner
- If you see a beaker icon (🧪), demo mode is already active
- If not, you need to enable it through settings or the device modal

### 3. Generate Data
Once demo mode is enabled, you'll see a yellow/orange card with:

**Demo Mode Active**
- Using simulated watch data for testing

Two buttons appear:
- **New Data** - Generate one data point and save to Supabase
- **7-Day History** - Generate a week of data for charts

### 4. View Your Data
Click on any metric card to see:
- Current value
- 7-day trend chart
- Statistics (average, min, max)
- Historical data

## What Data Gets Generated?

Each data point includes:

| Metric | Range | Typical |
|--------|-------|---------|
| Heart Rate | 50-150 BPM | ~72 BPM |
| Steps | 0-10,000+ | ~5,000 |
| Calories | 500-2,000+ | ~1,200 kcal |
| Oxygen | 90-100% | ~98% |
| Blood Pressure | 100-160 / 60-100 | 120/80 mmHg |
| Battery | 0-100% | Decreases ~2% |

## Example Workflow

### Testing Heart Rate Screen
```
1. Open Health Dashboard
2. Enable Demo Mode (if needed)
3. Click "New Data" button
4. Tap "Heart Rate" metric card
5. See current reading and 7-day chart
6. Click "Measure Now" to sync more data
```

### Testing with Historical Data
```
1. Open Health Dashboard
2. Click "7-Day History" button
3. Wait for data to save (shows alert)
4. Open any metric screen
5. See full 7-day trend chart
6. View statistics (avg, min, max)
```

### Verifying in Supabase
```
1. Go to Supabase Dashboard
2. Open health_metrics table
3. Filter by device_type = 'demo'
4. See all generated data points
5. Verify timestamps and values
```

## Disabling Demo Mode

To disable demo mode:
1. Look for the beaker icon (🧪) in the top-right
2. Tap it to toggle demo mode off
3. The demo card will disappear
4. You can now connect a real watch

## Troubleshooting

### Demo Mode Not Showing
- Make sure you're logged in
- Check that Supabase is connected
- Try refreshing the screen

### Data Not Appearing After Clicking Button
- Wait a few seconds for Supabase to save
- Check your internet connection
- Refresh the screen
- Check browser console for errors

### Can't See Charts
- Generate at least 2 data points first
- Use "7-Day History" to get multiple points
- Refresh the metric screen

## Tips

✅ **Do:**
- Generate 7-day history first to see full charts
- Use "New Data" to test real-time updates
- Test each metric screen individually
- Check Supabase to verify data is saving

❌ **Don't:**
- Leave demo mode on when using real watch
- Generate too much data (it's just for testing)
- Rely on demo data for actual health tracking

## Next Steps

Once you're comfortable with the demo:
1. **Connect a Real Watch** - Follow the connection guide
2. **Test Real Data** - Verify actual metrics from your device
3. **Disable Demo Mode** - Switch to real health tracking
4. **Monitor Health** - Use the dashboard for daily tracking

## Need Help?

Check the full guide: `HEALTH_SCREEN_SETUP_GUIDE.md`

Key files:
- `src/services/mockDataService.ts` - Mock data generator
- `src/services/demoModeService.ts` - Demo mode manager
- `src/screens/Senior/HealthScreen.tsx` - Main dashboard
