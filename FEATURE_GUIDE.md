# CareTrek Map Features Guide

## New Floating Action Buttons

### 1. Current Location Button (Blue)
**Icon**: Locate/Target  
**Position**: Bottom-right, top button  
**Function**: Centers the map on your current location  
**Usage**: Tap to quickly return to your current position on the map

### 2. Turn-by-Turn Navigation Button (Green)
**Icon**: Navigate/Arrow  
**Position**: Bottom-right, middle button  
**Function**: Starts navigation to your saved home location  
**Availability**: Only appears when home location is saved  
**Usage**: Tap to begin turn-by-turn navigation with route visualization

### 3. Home Location Button (Purple)
**Icon**: Home  
**Position**: Bottom-right, bottom button  
**Function**: Opens the home location setup screen  
**Usage**: Tap to set or update your home location

## Home Location Screen Features

### Search Functionality
- **Search Bar**: Located at the top of the screen
- **Real-time Results**: Type to search for locations
- **Minimum Characters**: Requires at least 2 characters
- **Result Count**: Shows up to 10 results
- **Clear Button**: Tap X to clear search

### Setting Home Location
1. Use search bar to find your location, OR
2. Drag the map to position the marker
3. View the formatted address below the map
4. Tap "Save Home Location" button
5. Confirmation message appears

### Address Display
- Full formatted address with street, city, state, and postal code
- Updates automatically when map is moved
- Searchable location names

## Footer Information

### Current Location Display
- **Coordinates**: Latitude and longitude (6 decimal places)
- **Address**: Full formatted address from reverse geocoding
- **Real-time Updates**: Updates as you move

### Footer Buttons
- **Locate Button**: Quick access to center on current location
- **Home Button**: Save current location as home

## Dark Mode Support

All new features support dark mode:
- Floating buttons adapt colors
- Search bar styling adjusts
- Text colors optimize for readability
- Smooth transitions between themes

## Keyboard Shortcuts

### Search Screen
- **Enter/Return**: Submit search
- **Backspace**: Clear search (when search bar is focused)
- **Tap X**: Clear search results

## Accessibility Features

- All buttons have accessibility labels
- Touch targets are 56x56px (minimum recommended size)
- High contrast colors for visibility
- Keyboard navigation support

## Tips & Tricks

1. **Quick Navigation**: Set home location once, then use the green button for quick navigation
2. **Search Tips**: 
   - Search by street name, city, or landmark
   - Use postal codes for precise results
3. **Map Interaction**: Pinch to zoom, drag to pan
4. **Location Accuracy**: Allow location permissions for best accuracy
5. **Offline**: Map tiles may be cached for offline viewing

## Troubleshooting

### Floating Buttons Not Visible
- Check if buttons are hidden behind keyboard
- Verify screen size supports button placement
- Restart the app

### Search Not Working
- Ensure internet connection is active
- Check if location name is spelled correctly
- Try searching with different keywords

### Home Location Not Saving
- Verify you're logged in
- Check internet connection
- Ensure location permissions are granted
- Try refreshing the app

### Navigation Not Starting
- Ensure home location is set
- Check if route is available (internet required)
- Verify location permissions

## Performance Notes

- Search results load within 1-2 seconds
- Navigation routes calculate in real-time
- Location updates occur every 5-10 seconds
- Map rendering optimized for smooth scrolling
