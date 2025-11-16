// app.config.js
module.exports = {
  expo: {
    name: 'CareTrek',
    owner: "humeshdeshmukh0",
    slug: 'caretrek',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',

    // --- Android / iOS settings ---
    android: {
      package: 'com.humeshdeshmukh.caretrek',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      // Android runtime permissions required for BLE (especially Android 12+)
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        // Android 12+ new bluetooth permissions
        "BLUETOOTH_SCAN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_ADVERTISE"
      ]
    },
    ios: {
      bundleIdentifier: 'com.humeshdeshmukh.caretrek',
      buildNumber: '1.0.0',
      // iOS Info.plist keys required for Bluetooth / Location usage
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "This app needs Bluetooth access to connect to health devices.",
        NSBluetoothPeripheralUsageDescription: "Bluetooth is required to pair with health devices.",
        NSLocationWhenInUseUsageDescription: "Location permission may be required to discover Bluetooth devices on some Android versions."
      }
    },

    // --- Plugins ---
    plugins: [
      // react-native-ble-plx plugin (required for native BLE lib)
      "react-native-ble-plx",

      // preserve your existing expo-build-properties plugin and config
      [
        'expo-build-properties',
        {
          ios: {
            infoPlist: {
              ITSAppUsesNonExemptEncryption: false
            },
            useFrameworks: 'static'
          },
          android: {
            enableShrinkResourcesInReleaseBuild: false,
            enableProguardInReleaseBuild: false
          }
        }
      ],
    ],

    // --- Extra (env keys etc) ---
    extra: {
      // Add your Google Cloud Translation API key here
      // In production, use EAS secrets or a similar service
      // DO NOT commit your actual API key to version control
      GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || '',
      eas: {
        projectId: 'a9d5cfd0-23cb-447a-a5dd-bc71a6711fd6'
      }
    }
  }
};
