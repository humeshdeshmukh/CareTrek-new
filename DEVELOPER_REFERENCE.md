# Developer Reference - Health Screen

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Health Dashboard                      │
│                  (HealthScreen.tsx)                      │
├─────────────────────────────────────────────────────────┤
│  Demo Mode UI  │  Device Connection  │  Metric Display  │
└────────┬────────────────┬──────────────────┬────────────┘
         │                │                  │
    ┌────▼────┐    ┌─────▼──────┐    ┌─────▼──────┐
    │  Demo   │    │    BLE     │    │  Supabase  │
    │  Mode   │    │   Watch    │    │   Query    │
    │ Service │    │   Service  │    │  Service   │
    └────┬────┘    └─────┬──────┘    └─────┬──────┘
         │                │                  │
    ┌────▼────────────────▼──────────────────▼────┐
    │          Health Data Service                 │
    │  (Supabase Integration & Validation)        │
    └────┬──────────────────────────────────────┬─┘
         │                                      │
    ┌────▼────────────────────────────────────▼─┐
    │         Supabase Database                  │
    │      (health_metrics table)               │
    └──────────────────────────────────────────┘
```

## Service Layer

### mockDataService
**Purpose**: Generate realistic mock health data

```typescript
// Generate single data point
const data = mockDataService.generateMockData();
// Returns: MockHealthData

// Generate 7 days of data
const week = mockDataService.generateHistoricalData(7);
// Returns: MockHealthData[]

// Update base values for progression
mockDataService.updateBaseValues({ heartRate: 75 });

// Reset to defaults
mockDataService.reset();
```

**Data Structure**:
```typescript
interface MockHealthData {
  heartRate: number;
  steps: number;
  calories: number;
  oxygenSaturation: number;
  bloodPressure: { systolic: number; diastolic: number };
  battery: number;
  sleepData?: { duration: number; quality: string };
  hydration?: { waterIntake: number };
}
```

### demoModeService
**Purpose**: Manage demo mode state and Supabase integration

```typescript
// Initialize (load saved state)
await demoModeService.initialize();

// Enable demo mode
await demoModeService.enable();

// Disable demo mode
await demoModeService.disable();

// Check if active
const isActive = demoModeService.isActive();

// Get current mock data
const data = demoModeService.getMockData();

// Generate new mock data
const newData = demoModeService.generateNewMockData();

// Save to Supabase
await demoModeService.saveMockDataToSupabase(userId);

// Generate historical data
await demoModeService.generateHistoricalData(userId, 7);
```

### healthDataService
**Purpose**: Supabase integration and data persistence

```typescript
// Save health metrics from watch
const result = await saveHealthMetrics(userId, watchData);

// Get user's metrics
const metrics = await getUserHealthMetrics(userId, limit);

// Get health summary
const summary = await getHealthSummary(userId, days);
// Returns: { averageHeartRate, totalSteps, averageOxygen, latestMetrics }
```

**Data Mapping**:
```typescript
interface HealthMetric {
  id?: string;
  user_id: string;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  blood_oxygen?: number;
  temperature?: number;
  steps?: number;
  calories_burned?: number;
  sleep_duration_minutes?: number;
  recorded_at?: string;
  created_at?: string;
  updated_at?: string;
  battery?: number;
  device_id?: string;
  device_name?: string;
  rssi?: number;
  device_type?: string;
  timestamp: string;
}
```

## Component Integration

### HealthScreen.tsx

**State Management**:
```typescript
const [isDemoMode, setIsDemoMode] = useState(false);
const [demoData, setDemoData] = useState<any>(null);
```

**Key Functions**:
```typescript
// Initialize demo mode on mount
const initializeDemoMode = useCallback(async () => {
  await demoModeService.initialize();
  const isActive = demoModeService.isActive();
  setIsDemoMode(isActive);
}, []);

// Toggle demo mode
const toggleDemoMode = useCallback(async () => {
  if (isDemoMode) {
    await demoModeService.disable();
  } else {
    await demoModeService.enable();
  }
}, [isDemoMode]);

// Generate new data
const generateNewDemoData = useCallback(async () => {
  const newData = demoModeService.generateNewMockData();
  await demoModeService.saveMockDataToSupabase(userId);
  setDemoData(newData);
}, [userId]);

// Generate historical data
const generateHistoricalDemoData = useCallback(async () => {
  await demoModeService.generateHistoricalData(userId, 7);
}, [userId]);
```

**UI Elements**:
```typescript
// Demo mode card (shown when isDemoMode is true)
{isDemoMode && (
  <View style={[styles.demoCard, { backgroundColor: isDark ? '#2D3748' : '#FFF9E6' }]}>
    <View style={styles.demoHeader}>
      <MaterialCommunityIcons name="beaker" size={24} />
      <Text style={styles.demoTitle}>Demo Mode Active</Text>
      <TouchableOpacity onPress={toggleDemoMode}>
        <MaterialCommunityIcons name="close" size={20} />
      </TouchableOpacity>
    </View>
    <Text style={styles.demoText}>Using simulated watch data for testing</Text>
    <View style={styles.demoButtonsContainer}>
      <TouchableOpacity style={styles.demoButton} onPress={generateNewDemoData}>
        <MaterialCommunityIcons name="refresh" size={16} />
        <Text style={styles.demoButtonText}>New Data</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.demoButton} onPress={generateHistoricalDemoData}>
        <MaterialCommunityIcons name="history" size={16} />
        <Text style={styles.demoButtonText}>7-Day History</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

## Data Validation

### Heart Rate
```typescript
if (value >= 30 && value <= 220) {
  // Valid
}
```

### Blood Pressure
```typescript
if (sys >= 70 && sys <= 260 && dia >= 40 && dia <= 200 && sys > dia) {
  // Valid
}
```

### Blood Oxygen
```typescript
if (value >= 50 && value <= 100) {
  // Valid
}
```

### Steps
```typescript
if (value >= 0 && value < 1000000) {
  // Valid
}
```

### Calories
```typescript
if (value > 0 && value < 200000) {
  // Valid
}
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const data = await demoModeService.saveMockDataToSupabase(userId);
  // Success
} catch (error) {
  console.error('Error:', error);
  Alert.alert('Error', 'Failed to save data');
}
```

### Validation Pattern
```typescript
if (!userId) {
  Alert.alert('Error', 'User not authenticated');
  return;
}

if (!watchData.deviceId) {
  throw new Error('Device ID is required');
}
```

## Testing

### Unit Tests
```typescript
// Test mock data generation
const data = mockDataService.generateMockData();
expect(data.heartRate).toBeGreaterThanOrEqual(50);
expect(data.heartRate).toBeLessThanOrEqual(150);

// Test historical data
const week = mockDataService.generateHistoricalData(7);
expect(week.length).toBe(7);

// Test demo mode
await demoModeService.enable();
expect(demoModeService.isActive()).toBe(true);
```

### Integration Tests
```typescript
// Test Supabase save
const result = await demoModeService.saveMockDataToSupabase(userId);
expect(result).toBeDefined();
expect(result.id).toBeDefined();

// Test data retrieval
const metrics = await getUserHealthMetrics(userId);
expect(metrics.length).toBeGreaterThan(0);
```

## Performance Optimization

### Memoization
```typescript
const initializeDemoMode = useCallback(async () => {
  // Only recreate if dependencies change
}, []);
```

### Conditional Rendering
```typescript
{isDemoMode && (
  // Only render when demo mode is active
  <DemoCard />
)}
```

### Async Operations
```typescript
// Non-blocking Supabase calls
await demoModeService.saveMockDataToSupabase(userId);
// UI remains responsive
```

## Common Patterns

### Loading State
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await demoModeService.generateHistoricalData(userId, 7);
  } finally {
    setLoading(false);
  }
};
```

### Error State
```typescript
const [error, setError] = useState<string | null>(null);

const handleAction = async () => {
  try {
    await demoModeService.enable();
    setError(null);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  }
};
```

### Success Feedback
```typescript
const handleAction = async () => {
  try {
    await demoModeService.generateHistoricalData(userId, 7);
    Alert.alert('Success', 'Generated 7 days of data');
  } catch (err) {
    Alert.alert('Error', 'Failed to generate data');
  }
};
```

## Debugging

### Console Logging
```typescript
console.log('[DemoMode] Initialized:', isActive);
console.log('[DemoMode] Data saved:', data);
console.error('[DemoMode] Error:', error);
```

### Supabase Logs
- Check Supabase dashboard for query logs
- Monitor database for insert/update operations
- Review error messages in browser console

### React DevTools
- Inspect component state
- Check prop values
- Monitor re-renders

## Performance Metrics

- Demo data generation: < 1ms
- Supabase save: 100-500ms
- Chart rendering: < 100ms
- Historical data query: 200-1000ms

## Best Practices

✅ **Do:**
- Always check user authentication
- Validate data before saving
- Use try-catch for async operations
- Show loading states
- Provide user feedback
- Test with real data

❌ **Don't:**
- Save invalid data
- Ignore errors
- Block UI during async operations
- Leave demo mode enabled in production
- Hardcode user IDs
- Skip data validation

## Useful Commands

### Generate Test Data
```typescript
// Single data point
const data = mockDataService.generateMockData();

// Week of data
const week = mockDataService.generateHistoricalData(7);

// Save to Supabase
await demoModeService.saveMockDataToSupabase(userId);
```

### Query Supabase
```typescript
// Get user metrics
const metrics = await getUserHealthMetrics(userId, 50);

// Get summary
const summary = await getHealthSummary(userId, 7);

// Filter by device type
const demoMetrics = metrics.filter(m => m.device_type === 'demo');
```

### Debug State
```typescript
// Check demo mode
console.log('Demo mode active:', demoModeService.isActive());

// Check current data
console.log('Current data:', demoModeService.getMockData());

// Check stored metrics
const stored = await demoModeService.getStoredMetrics?.();
console.log('Stored metrics:', stored);
```

## Resources

- `src/services/mockDataService.ts` - Mock data generator
- `src/services/demoModeService.ts` - Demo mode manager
- `src/services/healthDataService.ts` - Supabase integration
- `src/screens/Senior/HealthScreen.tsx` - Main component
- `HEALTH_SCREEN_SETUP_GUIDE.md` - Full documentation
- `DATABASE_SCHEMA_INFO.md` - Database reference

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Status**: Production Ready
