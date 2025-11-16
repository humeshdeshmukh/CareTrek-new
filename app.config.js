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

    // --- Android Settings ---
    android: {
      package: 'com.humeshdeshmukh.caretrek',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },

      // Android BLE Permissions
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "BLUETOOTH_SCAN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_ADVERTISE"
      ]
    },

    // --- iOS Settings ---
    ios: {
      bundleIdentifier: 'com.humeshdeshmukh.caretrek',
      buildNumber: '1.0.0',
      infoPlist: {
        NSBluetoothAlwaysUsageDescription:
          "This app needs Bluetooth access to connect to health devices.",
        NSBluetoothPeripheralUsageDescription:
          "Bluetooth is required to pair with health devices.",
        NSLocationWhenInUseUsageDescription:
          "Location permission may be required to discover Bluetooth devices on some Android versions."
      }
    },

    // --- Expo Plugins ---
    plugins: [
      // Updated BLE plugin (deprecated permission removed)
      [
        "@config-plugins/react-native-ble-plx",
        {
          isBackgroundEnabled: true,
          modes: ["peripheral", "central"],
          bluetoothAlwaysPermission:
            "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
          // ⛔ Removed deprecated:
          // bluetoothPeripheralPermission: "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ],

      // Build properties plugin
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
      ]
    ],

    // --- Extra (Environment Variables) ---
    extra: {
      GOOGLE_TRANSLATE_API_KEY:
        process.env.GOOGLE_TRANSLATE_API_KEY || '',
      eas: {
        projectId: 'a9d5cfd0-23cb-447a-a5dd-bc71a6711fd6'
      }
    }
  }
};
