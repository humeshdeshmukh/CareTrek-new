#!/usr/bin/env python3
"""
Generate app icons from the reference image
Creates: icon.png, favicon.png, adaptive-icon.png, splash-icon.png
"""

from PIL import Image, ImageDraw, ImageFilter
import os

# Define paths
ASSETS_DIR = "assets"
SOURCE_IMAGE = os.path.join(ASSETS_DIR, "ChatGPT Image Nov 6, 2025, 07_19_20 PM.png")

# Icon specifications
ICONS = {
    "icon.png": (1024, 1024),  # Main app icon
    "favicon.png": (192, 192),  # Web favicon
    "adaptive-icon.png": (108, 108),  # Android adaptive icon (foreground)
    "splash-icon.png": (1280, 1280),  # Splash screen
}

def create_icons():
    """Generate all required icons from source image"""
    
    if not os.path.exists(SOURCE_IMAGE):
        print(f"Error: Source image not found at {SOURCE_IMAGE}")
        return False
    
    try:
        # Open source image
        source = Image.open(SOURCE_IMAGE)
        print(f"Loaded source image: {source.size}")
        
        # Generate each icon
        for icon_name, size in ICONS.items():
            output_path = os.path.join(ASSETS_DIR, icon_name)
            
            # Create a new image with the target size
            icon = Image.new('RGBA', size, (255, 255, 255, 0))
            
            # Resize source image to fit
            source_resized = source.copy()
            source_resized.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Calculate position to center the image
            x = (size[0] - source_resized.width) // 2
            y = (size[1] - source_resized.height) // 2
            
            # Paste the resized image
            icon.paste(source_resized, (x, y), source_resized if source_resized.mode == 'RGBA' else None)
            
            # Save icon
            icon.save(output_path, 'PNG')
            print(f"✓ Created {icon_name} ({size[0]}x{size[1]})")
        
        print("\n✓ All icons generated successfully!")
        return True
        
    except Exception as e:
        print(f"Error generating icons: {e}")
        return False

if __name__ == "__main__":
    create_icons()
