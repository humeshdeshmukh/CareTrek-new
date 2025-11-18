// src/services/mockDataService.ts
// Mock data service for testing health screens without a real watch

export interface MockHealthData {
  heartRate: number;
  steps: number;
  calories: number;
  oxygenSaturation: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  battery: number;
  sleepData?: {
    duration: number;
    quality: string;
  };
  hydration?: {
    waterIntake: number;
  };
}

class MockDataService {
  private baseHeartRate = 72;
  private baseSteps = 5000;
  private baseCalories = 1200;
  private baseOxygen = 98;
  private baseBatterySystolic = 120;
  private baseBatterDiastolic = 80;
  private baseBattery = 85;

  /**
   * Generate realistic mock health data with slight variations
   */
  generateMockData(): MockHealthData {
    // Add random variations to simulate real data
    const variation = () => (Math.random() - 0.5) * 20;

    return {
      heartRate: Math.max(50, Math.min(150, Math.round(this.baseHeartRate + variation()))),
      steps: Math.max(0, Math.round(this.baseSteps + variation() * 100)),
      calories: Math.max(0, Math.round(this.baseCalories + variation() * 50)),
      oxygenSaturation: Math.max(90, Math.min(100, Math.round(this.baseOxygen + variation() * 0.5))),
      bloodPressure: {
        systolic: Math.max(100, Math.min(160, Math.round(this.baseBatterySystolic + variation() * 0.5))),
        diastolic: Math.max(60, Math.min(100, Math.round(this.baseBatterDiastolic + variation() * 0.5))),
      },
      battery: Math.max(0, Math.min(100, Math.round(this.baseBattery - Math.random() * 2))),
      sleepData: {
        duration: Math.round(6 * 60 + Math.random() * 120), // 6-8 hours in minutes
        quality: ['Good', 'Fair', 'Excellent'][Math.floor(Math.random() * 3)],
      },
      hydration: {
        waterIntake: Math.round(1500 + Math.random() * 1000), // 1.5-2.5 liters
      },
    };
  }

  /**
   * Generate historical data for charts (last 7 days)
   */
  generateHistoricalData(days = 7): MockHealthData[] {
    const data: MockHealthData[] = [];
    for (let i = 0; i < days; i++) {
      data.push(this.generateMockData());
    }
    return data;
  }

  /**
   * Update base values to simulate progression
   */
  updateBaseValues(data: Partial<MockHealthData>) {
    if (data.heartRate) this.baseHeartRate = data.heartRate;
    if (data.steps) this.baseSteps = data.steps;
    if (data.calories) this.baseCalories = data.calories;
    if (data.oxygenSaturation) this.baseOxygen = data.oxygenSaturation;
    if (data.bloodPressure) {
      this.baseBatterySystolic = data.bloodPressure.systolic;
      this.baseBatterDiastolic = data.bloodPressure.diastolic;
    }
    if (data.battery) this.baseBattery = data.battery;
  }

  /**
   * Reset to default values
   */
  reset() {
    this.baseHeartRate = 72;
    this.baseSteps = 5000;
    this.baseCalories = 1200;
    this.baseOxygen = 98;
    this.baseBatterySystolic = 120;
    this.baseBatterDiastolic = 80;
    this.baseBattery = 85;
  }
}

export const mockDataService = new MockDataService();
