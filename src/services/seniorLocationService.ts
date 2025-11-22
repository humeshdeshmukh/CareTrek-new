import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the task in the global scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error('[BackgroundLocation] Task error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (location) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Save to Supabase
                // We use a 'senior_locations' table or similar. 
                // For this implementation, we'll assume a table structure or use a generic data table if preferred.
                // Let's try to use a dedicated 'senior_locations' table for performance if it exists, 
                // otherwise we might need to create it or use 'senior_data'.
                // Given the plan, we proceed with 'senior_locations'.

                const { error: dbError } = await supabase
                    .from('senior_locations')
                    .insert({
                        senior_id: user.id,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        timestamp: new Date(location.timestamp).toISOString(),
                    });

                if (dbError) {
                    console.error('[BackgroundLocation] Database save error:', dbError);
                } else {
                    console.log('[BackgroundLocation] Location saved:', location.coords.latitude, location.coords.longitude);
                }

            } catch (err) {
                console.error('[BackgroundLocation] Save error:', err);
            }
        }
    }
});

export const seniorLocationService = {
    // Senior Side: Start background updates
    async startBackgroundLocationUpdates() {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status === 'granted') {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 60000, // Update every 1 minute
                    distanceInterval: 50, // Or every 50 meters
                    foregroundService: {
                        notificationTitle: "CareTrek Live Tracking",
                        notificationBody: "Sharing your location with family...",
                    },
                });
                console.log('[SeniorLocation] Background updates started');
                return true;
            } else {
                console.warn('[SeniorLocation] Background permission denied');
                return false;
            }
        } catch (error) {
            console.error('[SeniorLocation] Error starting updates:', error);
            return false;
        }
    },

    // Senior Side: Stop background updates
    async stopBackgroundLocationUpdates() {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                console.log('[SeniorLocation] Background updates stopped');
            }
        } catch (error) {
            console.error('[SeniorLocation] Error stopping updates:', error);
        }
    },

    // Senior Side: Check if tracking is active
    async isTrackingActive() {
        return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    },

    // Family Side: Get latest location
    async getLatestLocation(seniorId: string) {
        try {
            const { data, error } = await supabase
                .from('senior_locations')
                .select('*')
                .eq('senior_id', seniorId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SeniorLocation] Error fetching latest location:', error);
            return null;
        }
    },

    // Family Side: Subscribe to real-time updates
    subscribeToLocationUpdates(seniorId: string, onUpdate: (location: any) => void) {
        const subscription = supabase
            .channel(`location_updates:${seniorId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'senior_locations',
                    filter: `senior_id=eq.${seniorId}`,
                },
                (payload) => {
                    onUpdate(payload.new);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }
};
