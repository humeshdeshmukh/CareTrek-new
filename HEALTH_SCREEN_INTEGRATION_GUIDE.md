# HealthScreen Integration Guide

## Quick Integration Steps

To integrate the new health metric detail screens into your existing HealthScreen, follow these steps:

### 1. Update Metric Card Navigation

For each metric card in HealthScreen, wrap it with a navigation handler:

```typescript
// Example for Heart Rate Card
<TouchableOpacity 
  onPress={() => navigation.navigate('HeartRate')}
  activeOpacity={0.7}
>
  <View style={[styles.metricCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
    {/* Existing card content */}
    <View style={styles.cardHeader}>
      <MaterialCommunityIcons name="heart" size={24} color="#FF6B6B" />
      <Text style={[styles.metricLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
        Heart Rate
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
    </View>
    <Text style={[styles.metricValue, { color: '#FF6B6B' }]}>
      {watchData.heartRate || 'N/A'} BPM
    </Text>
    <Text style={[styles.metricTime, { color: isDark ? '#A0AEC0' : '#718096' }]}>
      {watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'No data'}
    </Text>
  </View>
</TouchableOpacity>
```

### 2. Metric Card Template

Use this template for all metric cards:

```typescript
const MetricCard = ({ 
  icon, 
  label, 
  value, 
  unit, 
  color, 
  time,
  onPress 
}) => {
  const { isDark } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.metricCard, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
          <Text style={[styles.metricLabel, { color: isDark ? '#E2E8F0' : '#1A202C' }]}>
            {label}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? '#A0AEC0' : '#718096'} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.metricValue, { color }]}>
            {value || 'N/A'}
          </Text>
          <Text style={[styles.metricUnit, { color: isDark ? '#A0AEC0' : '#718096' }]}>
            {unit}
          </Text>
        </View>
        <Text style={[styles.metricTime, { color: isDark ? '#A0AEC0' : '#718096' }]}>
          {time}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
```

### 3. Navigation Handlers

Add these navigation handlers to your HealthScreen component:

```typescript
const handleNavigateToMetric = (screen: string) => {
  navigation.navigate(screen);
};

// Or individual handlers:
const handleHeartRatePress = () => navigation.navigate('HeartRate');
const handleStepsPress = () => navigation.navigate('Steps');
const handleOxygenPress = () => navigation.navigate('Oxygen');
const handleBloodPressurePress = () => navigation.navigate('BloodPressure');
const handleCaloriesPress = () => navigation.navigate('Calories');
const handleSleepPress = () => navigation.navigate('Sleep');
const handleHydrationPress = () => navigation.navigate('Hydration');
```

### 4. Update HealthScreen Layout

Organize metrics in a grid or list:

```typescript
// Grid Layout (2 columns)
<View style={styles.metricsGrid}>
  <View style={styles.column}>
    <MetricCard
      icon="heart"
      label="Heart Rate"
      value={watchData.heartRate}
      unit="BPM"
      color="#FF6B6B"
      time={watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'N/A'}
      onPress={handleHeartRatePress}
    />
    <MetricCard
      icon="walk"
      label="Steps"
      value={watchData.steps}
      unit="steps"
      color="#4CAF50"
      time={watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'N/A'}
      onPress={handleStepsPress}
    />
  </View>
  
  <View style={styles.column}>
    <MetricCard
      icon="lungs"
      label="Oxygen"
      value={watchData.oxygenSaturation}
      unit="%"
      color="#2196F3"
      time={watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'N/A'}
      onPress={handleOxygenPress}
    />
    <MetricCard
      icon="heart-pulse"
      label="Blood Pressure"
      value={watchData.bloodPressure ? `${watchData.bloodPressure.systolic}/${watchData.bloodPressure.diastolic}` : 'N/A'}
      unit="mmHg"
      color="#E91E63"
      time={watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'N/A'}
      onPress={handleBloodPressurePress}
    />
  </View>
</View>

{/* Additional metrics */}
<View style={styles.metricsGrid}>
  <View style={styles.column}>
    <MetricCard
      icon="fire"
      label="Calories"
      value={watchData.calories}
      unit="kcal"
      color="#FF9800"
      time={watchData.lastUpdated ? dayjs(watchData.lastUpdated).format('HH:mm') : 'N/A'}
      onPress={handleCaloriesPress}
    />
    <MetricCard
      icon="moon-waning-crescent"
      label="Sleep"
      value={watchData.sleepData ? `${Math.floor(watchData.sleepData.duration / 60)}h` : 'N/A'}
      unit="duration"
      color="#9C27B0"
      time={watchData.sleepData ? dayjs(watchData.sleepData.timestamp).format('HH:mm') : 'N/A'}
      onPress={handleSleepPress}
    />
  </View>
  
  <View style={styles.column}>
    <MetricCard
      icon="water"
      label="Hydration"
      value={watchData.hydration ? watchData.hydration.waterIntake : 'N/A'}
      unit="ml"
      color="#2196F3"
      time={watchData.hydration ? dayjs(watchData.hydration.timestamp).format('HH:mm') : 'N/A'}
      onPress={handleHydrationPress}
    />
  </View>
</View>
```

### 5. Add Sync Button

Add a global sync button to refresh all metrics:

```typescript
<TouchableOpacity
  style={[styles.syncButton, { opacity: isSyncing ? 0.6 : 1 }]}
  onPress={async () => {
    try {
      await syncDeviceData();
      // Show success message
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }}
  disabled={isSyncing}
>
  {isSyncing ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <>
      <MaterialCommunityIcons name="sync" size={20} color="#FFFFFF" />
      <Text style={styles.syncButtonText}>Sync All Data</Text>
    </>
  )}
</TouchableOpacity>
```

### 6. Styling

Add these styles to your HealthScreen stylesheet:

```typescript
const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  metricCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  cardContent: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 12,
    marginTop: 4,
  },
  metricTime: {
    fontSize: 11,
    marginTop: 8,
  },
  syncButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## Data Flow

```
HealthScreen
    ↓
[Metric Cards with Navigation]
    ↓
[Detail Screens]
    ├─ HeartRateScreen
    ├─ StepsScreen
    ├─ OxygenScreen
    ├─ BloodPressureScreen
    ├─ CaloriesScreen
    ├─ SleepScreen
    └─ HydrationScreen
    ↓
[Measure/Sync Button]
    ↓
[useBLEWatch Hook]
    ↓
[Watch Device / Mobile Sensors]
```

## Key Props and Functions

### useBLEWatch Hook
```typescript
const {
  watchData,              // Current watch data
  devices,               // Available devices
  isScanning,            // Scanning status
  selectedDeviceType,    // Selected device type
  syncDeviceData,        // Function to sync data
  disconnectDevice,      // Function to disconnect
  isSyncing,             // Syncing status
  lastSync,              // Last sync timestamp
  syncError,             // Sync error message
} = useBLEWatch();
```

### Navigation Props
```typescript
const { navigation } = props;

// Navigate to detail screen
navigation.navigate('HeartRate');
navigation.navigate('Steps');
navigation.navigate('Oxygen');
navigation.navigate('BloodPressure');
navigation.navigate('Calories');
navigation.navigate('Sleep');
navigation.navigate('Hydration');

// Go back
navigation.goBack();
```

## Testing

Test the following scenarios:

1. **Navigation**
   - [ ] Tap each metric card navigates to correct detail screen
   - [ ] Back button returns to HealthScreen
   - [ ] Navigation state is preserved

2. **Data Display**
   - [ ] Current values display correctly
   - [ ] Charts show 7-day data
   - [ ] Statistics calculate accurately
   - [ ] Status indicators show correct colors

3. **Sync Functionality**
   - [ ] Measure button triggers data collection
   - [ ] Loading state shows during sync
   - [ ] Data updates after sync
   - [ ] Error handling works

4. **UI/UX**
   - [ ] Dark mode works on all screens
   - [ ] Responsive layout on different screen sizes
   - [ ] Smooth animations and transitions
   - [ ] Proper spacing and alignment

## Troubleshooting

### Screens Not Navigating
- Verify route names match exactly in RootNavigator
- Check navigation prop is passed correctly
- Ensure screens are registered in Stack.Navigator

### Data Not Displaying
- Check useBLEWatch hook returns data
- Verify data format matches screen expectations
- Check database queries in services

### Styling Issues
- Verify color values are correct
- Check theme context is working
- Test on both light and dark modes

## Next Steps

1. Integrate metric cards into HealthScreen
2. Test navigation to all detail screens
3. Verify data syncing works
4. Add animations and transitions
5. Implement notifications for abnormal readings
6. Add export functionality
