// src/components/ProtectedRoute.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNavigation } from '@react-navigation/native';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'senior' | 'family';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigation.navigate('Auth' as never);
    } else if (requiredRole && user?.role !== requiredRole) {
      navigation.navigate('Unauthorized' as never);
    }
  }, [isAuthenticated, user?.role, requiredRole, navigation]);

  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;