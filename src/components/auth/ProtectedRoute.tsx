import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'family' | 'senior';
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, redirect to sign in
      router.replace('/auth/signin');
    } else if (!loading && user && requiredRole && role !== requiredRole) {
      // User is authenticated but doesn't have the required role
      // Redirect to the appropriate dashboard based on their role
      router.replace(role === 'family' ? '/family' : '/senior');
    }
  }, [user, loading, requiredRole, role, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  if (!user || (requiredRole && role !== requiredRole)) {
    // Show nothing while redirecting
    return null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
