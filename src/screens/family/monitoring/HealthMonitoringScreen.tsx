import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserHealthMetrics, getHealthSummary } from '../../../services/healthDataService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useConnectedSenior } from '../../../hooks/useConnectedSenior';

const HealthMonitoringScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const route = useRoute();

    // Use the standardized hook
    const { senior, loading: seniorLoading, noSeniors } = useConnectedSenior();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [healthData, setHealthData] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);

    const fetchData = async () => {
        if (!senior) return;

        try {
            const [metrics, summaryData] = await Promise.all([
                getUserHealthMetrics(senior.id, 1), // Get latest metric
                getHealthSummary(senior.id, 1) // Get today's summary
            ]);

            setHealthData(metrics[0] || null);
            setSummary(summaryData);
        } catch (error) {
            console.error('Error fetching health data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (senior) {
            fetchData();
        }
    }, [senior]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const MetricCard = ({ icon, label, value, unit, color, subtitle, status }: any) => (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.cardHeader]}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <MaterialCommunityIcons name={icon} size={24} color={color} />
                </View>
                {status && (
                    <Text style={[styles.statusText, { color: colors.textSecondary, fontSize: 12 }]}>{status}</Text>
                )}
            </View>
            <View style={styles.metricInfo}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
                <View style={styles.valueContainer}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{value || '--'}</Text>
                    <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{unit}</Text>
                </View>
                {subtitle && <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
        </View>
    );

    if (seniorLoading || (loading && !healthData)) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (noSeniors) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>No seniors connected</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const lastUpdated = healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'Never';
    const isToday = healthData?.timestamp ? new Date(healthData.timestamp).toDateString() === new Date().toDateString() : false;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {senior?.name}'s Health
                    </Text>
                    <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
                        Last updated: {lastUpdated}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('SeniorNotes' as never)} style={[styles.refreshButton, { marginRight: 8 }]}>
                        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                        <Ionicons name="refresh" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {!isToday && healthData && (
                    <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="warning" size={20} color="#D97706" />
                        <Text style={[styles.warningText, { color: '#92400E' }]}>
                            Data is not from today. Last sync was {new Date(healthData.timestamp).toLocaleDateString()}.
                        </Text>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Status</Text>

                <View style={styles.grid}>
                    <MetricCard
                        icon="heart-pulse"
                        label="Heart Rate"
                        value={healthData?.heart_rate}
                        unit="BPM"
                        color="#EF4444"
                        status={healthData?.heart_rate ? 'Normal' : 'No data'}
                    />
                    <MetricCard
                        icon="walk"
                        label="Steps Today"
                        value={healthData?.steps}
                        unit="steps"
                        color="#10B981"
                        subtitle={healthData?.steps ? `${Math.round((healthData.steps / 10000) * 100)}% of goal` : ''}
                    />
                    <MetricCard
                        icon="water-percent"
                        label="Blood Oxygen"
                        value={healthData?.blood_oxygen}
                        unit="%"
                        color="#3B82F6"
                        status={healthData?.blood_oxygen ? (healthData.blood_oxygen >= 95 ? 'Good' : 'Low') : 'No data'}
                    />
                    <MetricCard
                        icon="fire"
                        label="Calories"
                        value={healthData?.calories_burned}
                        unit="kcal"
                        color="#F59E0B"
                    />
                    <MetricCard
                        icon="moon-waning-crescent"
                        label="Sleep"
                        value={healthData?.sleep_duration_minutes ? Math.floor(healthData.sleep_duration_minutes / 60) : '--'}
                        unit="hours"
                        color="#8B5CF6"
                        subtitle={healthData?.sleep_duration_minutes ? `${healthData.sleep_duration_minutes % 60} mins` : ''}
                    />
                </View>

                {healthData?.blood_pressure_systolic && (
                    <View style={[styles.bpCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#EC489920' }]}>
                            <MaterialCommunityIcons name="heart-pulse" size={24} color="#EC4899" />
                        </View>
                        <View style={styles.metricInfo}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Blood Pressure</Text>
                            <Text style={[styles.metricValue, { color: colors.text }]}>
                                {healthData.blood_pressure_systolic}/{healthData.blood_pressure_diastolic} <Text style={{ fontSize: 16, color: colors.textSecondary }}>mmHg</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {healthData?.battery !== undefined && (
                    <View style={[styles.batteryContainer, { backgroundColor: colors.card }]}>
                        <MaterialCommunityIcons
                            name={healthData.battery > 20 ? "battery" : "battery-alert"}
                            size={20}
                            color={healthData.battery > 20 ? "#10B981" : "#EF4444"}
                        />
                        <Text style={[styles.batteryText, { color: colors.text }]}>
                            Device Battery: {healthData.battery}%
                        </Text>
                    </View>
                )}

                {!healthData && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="heart-broken" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No health data available.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    card: {
        width: '47%',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricInfo: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
        marginRight: 4,
    },
    metricUnit: {
        fontSize: 14,
    },
    metricSubtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    bpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    batteryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
        justifyContent: 'center',
    },
    batteryText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 48,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statusText: {
        fontWeight: '500',
    },
    lastUpdated: {
        fontSize: 12,
    },
    refreshButton: {
        padding: 8,
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    warningText: {
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
});

export default HealthMonitoringScreen;
