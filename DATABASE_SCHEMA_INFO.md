# Database Schema Information

## Current Supabase Table: health_metrics

Your `health_metrics` table is properly configured and matches the application requirements.

### Table Structure

```sql
CREATE TABLE public.health_metrics (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  heart_rate integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  blood_oxygen integer,
  temperature numeric(4, 1),
  steps integer,
  calories_burned integer,
  sleep_duration_minutes integer,
  recorded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  battery integer,
  device_id uuid,
  device_name text,
  rssi integer,
  device_type text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT health_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT health_metrics_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### Indexes

```sql
CREATE INDEX health_metrics_user_id_idx ON public.health_metrics USING btree (user_id);
CREATE INDEX health_metrics_recorded_at_idx ON public.health_metrics USING btree (recorded_at);
CREATE INDEX idx_health_metrics_user_id ON public.health_metrics USING btree (user_id);
CREATE INDEX idx_health_metrics_timestamp ON public.health_metrics USING btree ("timestamp");
```

### Trigger

```sql
CREATE TRIGGER update_health_metrics_updated_at 
BEFORE UPDATE ON health_metrics 
FOR EACH ROW 
EXECUTE FUNCTION update_modified_column();
```

## Column Descriptions

### Core Identifiers
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to auth.users |
| `device_id` | UUID | Device identifier (converted from MAC address) |
| `device_name` | text | Human-readable device name |
| `device_type` | text | Type: generic, miband, amazfit, firebolt, demo |

### Health Metrics
| Column | Type | Range | Description |
|--------|------|-------|-------------|
| `heart_rate` | integer | 30-220 | Beats per minute |
| `blood_pressure_systolic` | integer | 70-260 | mmHg |
| `blood_pressure_diastolic` | integer | 40-200 | mmHg |
| `blood_oxygen` | integer | 50-100 | % saturation |
| `temperature` | numeric(4,1) | 35-42 | Celsius |
| `steps` | integer | 0-∞ | Daily step count |
| `calories_burned` | integer | 0-200000 | kcal |
| `sleep_duration_minutes` | integer | 0-1440 | Minutes per night |

### Device Information
| Column | Type | Description |
|--------|------|-------------|
| `battery` | integer | Device battery 0-100% |
| `rssi` | integer | Signal strength (BLE) |

### Timestamps
| Column | Type | Description |
|--------|------|-------------|
| `recorded_at` | timestamp | When measurement was taken |
| `created_at` | timestamp | Record creation time (auto) |
| `updated_at` | timestamp | Last update time (auto) |
| `timestamp` | timestamp | Current timestamp (auto) |

## Data Mapping

### From Watch Data to Database

The application maps watch data as follows:

```typescript
watchData.heartRate → heart_rate
watchData.steps → steps
watchData.calories → calories_burned
watchData.oxygenSaturation → blood_oxygen
watchData.bloodPressure.systolic → blood_pressure_systolic
watchData.bloodPressure.diastolic → blood_pressure_diastolic
watchData.battery → battery
watchData.rssi → rssi
watchData.deviceId → device_id (converted to UUID)
watchData.deviceName → device_name
watchData.deviceType → device_type
```

## Optional Columns

The following columns are optional and can be NULL:

- `heart_rate` - Only set if watch supports HR monitoring
- `blood_pressure_systolic` - Only if device has BP sensor
- `blood_pressure_diastolic` - Only if device has BP sensor
- `blood_oxygen` - Only if device has SpO2 sensor
- `temperature` - Only if device has temperature sensor
- `steps` - Only if device tracks steps
- `calories_burned` - Only if device calculates calories
- `sleep_duration_minutes` - Only if device tracks sleep
- `battery` - Only if device reports battery
- `rssi` - Only if BLE signal is available
- `device_id` - Only if device ID is captured
- `device_name` - Only if device name is available
- `device_type` - Defaults to 'generic'

## Required Columns

These columns MUST be provided:

- `user_id` - Current authenticated user
- `timestamp` - Auto-set to current time

## Device Type Values

```
'generic'  - Unknown or generic BLE device
'miband'   - Xiaomi Mi Band
'amazfit'  - Amazfit smartwatch
'firebolt' - Firebolt device
'demo'     - Demo/mock data
```

## Validation Rules

### Heart Rate
- Valid range: 30-220 BPM
- Typical: 60-100 BPM at rest
- Invalid values are rejected

### Blood Pressure
- Systolic: 70-260 mmHg
- Diastolic: 40-200 mmHg
- Must have systolic > diastolic
- Normal: 120/80 mmHg

### Blood Oxygen
- Valid range: 50-100%
- Normal: 95-100%
- Values outside range are rejected

### Steps
- Valid range: 0 to 1,000,000,000
- Typical daily: 0-50,000
- Invalid values are rejected

### Calories
- Valid range: 0 to 200,000
- Typical daily: 1,500-2,500
- Invalid values are rejected

## Performance Considerations

### Indexes
- `user_id` - Indexed for fast user lookups
- `timestamp` - Indexed for time-range queries
- `recorded_at` - Indexed for historical queries

### Query Optimization
```typescript
// Fast - uses index
const metrics = await supabase
  .from('health_metrics')
  .select('*')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false })
  .limit(50);

// Fast - uses index
const metrics = await supabase
  .from('health_metrics')
  .select('*')
  .eq('user_id', userId)
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);
```

## Backup & Recovery

### Data Retention
- All data is retained indefinitely
- Soft delete is not implemented
- Use `ON DELETE CASCADE` for user cleanup

### Exporting Data
```typescript
// Get all metrics for a user
const { data } = await supabase
  .from('health_metrics')
  .select('*')
  .eq('user_id', userId)
  .order('timestamp', { ascending: false });

// Export to CSV
const csv = data.map(row => 
  `${row.timestamp},${row.heart_rate},${row.steps},...`
).join('\n');
```

## Future Enhancements

### Potential Columns to Add
- `notes` - User notes about the measurement
- `activity_type` - Type of activity (rest, exercise, etc.)
- `location` - GPS coordinates
- `weather` - Weather conditions
- `medication` - Medication taken
- `food_intake` - Meals consumed
- `stress_level` - Subjective stress rating
- `mood` - User mood indicator

### Potential Tables to Add
- `health_goals` - User health targets
- `health_alerts` - Abnormal reading alerts
- `device_settings` - Device-specific settings
- `health_notes` - Detailed health journal

## Troubleshooting

### Foreign Key Constraint Error
**Error**: `violates foreign key constraint "health_metrics_user_id_fkey"`

**Solution**: Ensure `user_id` is a valid UUID from `auth.users` table

### UUID Format Error
**Error**: `invalid input syntax for type uuid`

**Solution**: Device IDs are automatically converted to UUID format by `deviceIdToUUID()` function

### Timestamp Issues
**Error**: Data appears in wrong order or missing

**Solution**: Always use `timestamp` or `recorded_at` for ordering, not `created_at`

## Security

### Row Level Security (RLS)
Consider enabling RLS to restrict users to their own data:

```sql
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON health_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON health_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Data Privacy
- All user data is isolated by `user_id`
- No cross-user data leakage possible
- Timestamps are server-side for consistency
- Device IDs are anonymized as UUIDs

## Migration Notes

If you need to add new columns:

```sql
-- Add new column
ALTER TABLE health_metrics 
ADD COLUMN new_column_name data_type;

-- Create index if needed
CREATE INDEX idx_health_metrics_new_column 
ON public.health_metrics USING btree (new_column_name);

-- Update application code to use new column
```

## Support

For database issues:
1. Check Supabase dashboard for table structure
2. Verify all indexes are created
3. Test queries in Supabase SQL editor
4. Check user authentication
5. Review application logs for errors
