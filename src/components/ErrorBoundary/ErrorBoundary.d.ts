import { ComponentType } from 'react';

// Type for the error boundary props
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Type for the default fallback component
export interface DefaultFallbackProps {
  error: Error;
  resetError: () => void;
}

declare const ErrorBoundary: React.ComponentType<ErrorBoundaryProps> & {
  DefaultFallback: React.ComponentType<DefaultFallbackProps>;
};

export default ErrorBoundary;
