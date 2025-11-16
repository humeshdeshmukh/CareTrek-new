// src/components/BLEErrorBoundary.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type State = { hasError: boolean; error: any };

type BLEErrorBoundaryProps = {
  children: React.ReactNode;
  navigation?: StackNavigationProp<RootStackParamList, 'Health'>;
};

export class BLEErrorBoundary extends React.Component<BLEErrorBoundaryProps, State> {
  constructor(props: BLEErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('BLEErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
            Bluetooth Connection Error
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            {String(this.state.error?.message ?? 'An error occurred with the Bluetooth connection')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Retry" onPress={this.reset} />
            <Button 
              title="Go Back" 
              onPress={() => this.props.navigation?.goBack()} 
            />
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}
