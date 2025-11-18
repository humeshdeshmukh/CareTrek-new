# CareTrek Icons - Quick Reference Card

## 🎯 Icon Summary

| Icon | Size | Purpose | Location |
|------|------|---------|----------|
| **icon.png** | 1024×1024 | Main app icon | assets/icon.png |
| **adaptive-icon.png** | 108×108 | Android adaptive | assets/adaptive-icon.png |
| **favicon.png** | 192×192 | Web favicon | assets/favicon.png |
| **splash-icon.png** | 1280×1280 | Splash screen | assets/splash-icon.png |
| **notification-icon.png** | 192×192 | Notifications | assets/notification-icon.png |
| **app-store-icon.png** | 1024×1024 | App store | assets/app-store-icon.png |
| **banner-icon.png** | 1200×400 | Header banner | assets/banner-icon.png |
| **logo-variant.png** | 512×512 | Logo variant | assets/logo-variant.png |

## 🎨 Design Colors

```
Primary Green:    #5B9B6E  (91, 155, 110)
Secondary Orange: #D4845C  (212, 132, 92)
Accent Beige:     #E8D5C4  (232, 213, 196)
White:            #FFFFFF  (255, 255, 255)
```

## 📱 Platform Configuration

### app.json Setup
```json
{
  "icon": "./assets/icon.png",
  "splash": {
    "image": "./assets/splash-icon.png",
    "backgroundColor": "#ffffff"
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    }
  },
  "web": {
    "favicon": "./assets/favicon.png"
  }
}
```

## 🚀 Build Commands

```bash
# Generate icons
python create_professional_icons.py

# Build APK
eas build --platform android --local

# Install APK
adb install caretrek.apk
```

## ✨ Design Features

✓ Gradient backgrounds  
✓ Layered heart design  
✓ Medical cross symbol  
✓ Professional color palette  
✓ Optimized for all platforms  
✓ High-quality PNG format  

## 📋 File Sizes

- icon.png: 67 KB
- adaptive-icon.png: 1.23 KB
- favicon.png: 3.53 KB
- splash-icon.png: 134 KB
- notification-icon.png: 5.37 KB
- app-store-icon.png: 51 KB
- banner-icon.png: 14.58 KB
- logo-variant.png: 14 KB

## ✅ Pre-Build Checklist

- [ ] All PNG files exist in assets/
- [ ] app.json has correct paths
- [ ] Icon files are valid PNG format
- [ ] File permissions are correct
- [ ] No corrupted files

## 🔧 Regenerate Icons

If you need to update icons:

```bash
# Edit colors in create_professional_icons.py
# Then run:
python create_professional_icons.py
```

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Icons blank | Regenerate: `python create_professional_icons.py` |
| Adaptive icon cut off | Check 72×72 safe zone |
| Splash not showing | Verify splash-icon.png path in app.json |
| Build fails | Check PNG format and permissions |

---

**Status:** ✅ Complete  
**Version:** 1.0 Professional  
**Last Updated:** November 18, 2025
