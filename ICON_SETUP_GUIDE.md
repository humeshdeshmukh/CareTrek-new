# CareTrek App Icons Setup Guide

## Overview
All app icons have been generated from your reference image theme and configured in `app.json`.

## Generated Icons

### 1. **icon.png** (1024x1024)
- **Purpose:** Main app icon
- **Used for:** Home screen, app drawer, app store
- **Location:** `assets/icon.png`

### 2. **favicon.png** (192x192)
- **Purpose:** Web favicon
- **Used for:** Web browser tab, PWA
- **Location:** `assets/favicon.png`

### 3. **adaptive-icon.png** (108x108)
- **Purpose:** Android adaptive icon (foreground)
- **Used for:** Android 8.0+ devices
- **Location:** `assets/adaptive-icon.png`
- **Background:** White (#ffffff) - configured in app.json

### 4. **splash-icon.png** (1280x1280)
- **Purpose:** Splash screen during app launch
- **Used for:** Loading screen
- **Location:** `assets/splash-icon.png`

### 5. **logo.svg**
- **Purpose:** Vector logo for web and documentation
- **Used for:** Website, marketing materials
- **Location:** `assets/logo.svg`
- **Features:** Animated heart pulse effect, gradient background

## Configuration

### app.json Setup
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.caretrek.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## Building APK with Custom Icon

### Step 1: Ensure Icons are in Place
```bash
# Verify all icon files exist
ls -la assets/icon.png
ls -la assets/favicon.png
ls -la assets/adaptive-icon.png
ls -la assets/splash-icon.png
```

### Step 2: Build APK
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Build APK for Android
eas build --platform android --local

# Or build for both platforms
eas build --platform all --local
```

### Step 3: Install APK
```bash
# After build completes, download the APK
# Then install on device
adb install path/to/caretrek.apk

# Or manually install by transferring to device
```

## Theme Colors Used

| Element | Color | Hex Code |
|---------|-------|----------|
| Primary Green | Green | #2F855A |
| Secondary Green | Light Green | #38A169 |
| Text Dark | Dark Gray | #1A202C |
| Text Light | Light Gray | #718096 |
| Background | White | #FFFFFF |

## Icon Specifications by Platform

### iOS
- **App Icon:** 1024x1024 (icon.png)
- **Formats:** PNG
- **Background:** Transparent or solid color

### Android
- **App Icon:** 1024x1024 (icon.png)
- **Adaptive Icon:** 108x108 (adaptive-icon.png)
- **Formats:** PNG
- **Adaptive Icon Background:** #ffffff

### Web
- **Favicon:** 192x192 (favicon.png)
- **Logo:** SVG (logo.svg)
- **Formats:** PNG, SVG

### Splash Screen
- **Image:** 1280x1280 (splash-icon.png)
- **Background:** #ffffff
- **Resize Mode:** contain

## Customization

### To Update Icons
1. Replace the source image at `assets/ChatGPT Image Nov 6, 2025, 07_19_20 PM.png`
2. Run the generation script:
   ```bash
   python generate_icons.py
   ```
3. All icons will be regenerated automatically

### To Modify Colors
Edit `assets/logo.svg` and update the gradient colors:
```xml
<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#YOUR_COLOR_1" />
  <stop offset="100%" stop-color="#YOUR_COLOR_2" />
</linearGradient>
```

## Testing Icons

### Before Building
1. Check icon files exist and have correct sizes
2. Verify app.json has correct icon paths
3. Test splash screen appearance

### After Building
1. Install APK on device
2. Verify app icon appears correctly on home screen
3. Check splash screen during launch
4. Verify adaptive icon on Android 8.0+

## Troubleshooting

### Icons Not Showing
- **Issue:** Icons appear blank or corrupted
- **Solution:** Regenerate icons using `python generate_icons.py`

### Adaptive Icon Issues
- **Issue:** Icon appears cut off on Android
- **Solution:** Ensure adaptive-icon.png has content in center 72x72 area
- **Reference:** Android adaptive icon safe zone is 72x72 in 108x108 image

### Splash Screen Not Showing
- **Issue:** Splash screen doesn't appear during launch
- **Solution:** Check splash-icon.png exists and app.json splash config is correct

### Build Fails
- **Issue:** EAS build fails with icon errors
- **Solution:** 
  1. Verify all PNG files are valid
  2. Check file permissions
  3. Run `eas build --platform android --local` with verbose logging

## Next Steps

1. ✅ Icons generated from theme
2. ✅ app.json configured
3. 📱 Build APK: `eas build --platform android --local`
4. 📲 Install on device: `adb install caretrek.apk`
5. ✓ Verify icons display correctly

## Support

For issues or questions:
- Check EAS documentation: https://docs.expo.dev/build/setup/
- Verify icon sizes and formats
- Ensure app.json syntax is correct
