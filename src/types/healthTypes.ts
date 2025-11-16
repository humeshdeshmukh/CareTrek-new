export interface BloodPressure {
  systolic: number | null;
  diastolic: number | null;
}

export interface SleepData {
  hours: number;
  minutes: number;
}

export interface HealthData {
  heartRate: number | null;
  steps: number;
  oxygen: number | null;
  bloodPressure: BloodPressure;
  sleep: SleepData;
  bmi: number | null;
  lastUpdated: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  icon: string;
  color: string;
}
