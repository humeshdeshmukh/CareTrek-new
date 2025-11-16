import React from 'react';
import { Platform } from 'react-native';

// Import the appropriate component based on the platform
const SmartwatchConnect = Platform.select({
  web: () => require('./WebBluetoothConnect').default,
  default: () => require('../NativeSmartwatchConnect').default,
})();

export default SmartwatchConnect;
