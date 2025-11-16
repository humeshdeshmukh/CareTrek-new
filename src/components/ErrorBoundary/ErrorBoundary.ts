import * as React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

declare class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps: {
    FallbackComponent: React.ComponentType<{ error: Error; resetError: () => void }>;
  };
  
  constructor(props: ErrorBoundaryProps);
  static getDerivedStateFromError(error: Error): ErrorBoundaryState;
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
  resetError: () => void;
  render(): React.ReactNode;
}

export default ErrorBoundary;
