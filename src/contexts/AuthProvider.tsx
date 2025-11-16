// src/contexts/AuthProvider.tsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeAuth } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store/store';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (loading) {
    return null; // or a loading spinner
  }

  return <>{children}</>;
};

export default AuthProvider;