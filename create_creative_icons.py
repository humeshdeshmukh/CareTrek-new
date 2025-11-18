#!/usr/bin/env python3
"""
Create beautiful, creative icons for CareTrek app
Uses theme colors: Orange (#D4845C), Green (#5B9B6E), Beige (#E8D5C4)
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

ASSETS_DIR = "assets"

# Theme colors
COLOR_ORANGE = (212, 132, 92)      # Warm orange
COLOR_GREEN = (91, 155, 110)       # Sage green
COLOR_BEIGE = (232, 213, 196)      # Warm beige
COLOR_WHITE = (255, 255, 255)      # White
COLOR_DARK = (42, 42, 42)          # Dark gray
COLOR_LIGHT_GRAY = (200, 200, 200) # Light gray

def create_gradient_background(img, color1, color2):
    """Create a gradient background"""
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        # Linear interpolation between colors
        ratio = y / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        
        for x in range(width):
            pixels[x, y] = (r, g, b, 255)

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    
    # Draw corners
    draw.arc([x1, y1, x1+radius*2, y1+radius*2], 180, 270, fill=outline, width=width)
    draw.arc([x2-radius*2, y1, x2, y1+radius*2], 270, 360, fill=outline, width=width)
    draw.arc([x2-radius*2, y2-radius*2, x2, y2], 0, 90, fill=outline, width=width)
    draw.arc([x1, y2-radius*2, x1+radius*2, y2], 90, 180, fill=outline, width=width)
    
    # Draw rectangles
    draw.rectangle([x1+radius, y1, x2-radius, y2], fill=fill)
    draw.rectangle([x1, y1+radius, x2, y2-radius], fill=fill)

def create_main_icon():
    """Create main app icon with heart and health theme"""
    size = 1024
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle with gradient effect
    center = size // 2
    radius = size // 2 - 20
    
    # Draw gradient background
    for i in range(radius):
        ratio = i / radius
        r = int(COLOR_GREEN[0] * (1 - ratio) + COLOR_BEIGE[0] * ratio)
        g = int(COLOR_GREEN[1] * (1 - ratio) + COLOR_BEIGE[1] * ratio)
        b = int(COLOR_GREEN[2] * (1 - ratio) + COLOR_BEIGE[2] * ratio)
        draw.ellipse(
            [center - i, center - i, center + i, center + i],
            fill=(r, g, b, 255)
        )
    
    # Draw white circle in center
    inner_radius = radius - 80
    draw.ellipse(
        [center - inner_radius, center - inner_radius, 
         center + inner_radius, center + inner_radius],
        fill=COLOR_WHITE
    )
    
    # Draw heart shape (health symbol)
    heart_size = inner_radius * 1.2
    heart_x = center
    heart_y = center - 50
    
    # Heart shape using bezier-like curves
    points = []
    for angle in range(0, 360, 5):
        rad = math.radians(angle)
        # Heart formula
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    # Draw plus sign (medical cross)
    cross_size = inner_radius * 0.3
    cross_x = center + inner_radius * 0.4
    cross_y = center + inner_radius * 0.3
    
    # Horizontal line
    draw.rectangle(
        [cross_x - cross_size, cross_y - cross_size//4,
         cross_x + cross_size, cross_y + cross_size//4],
        fill=COLOR_GREEN
    )
    # Vertical line
    draw.rectangle(
        [cross_x - cross_size//4, cross_y - cross_size,
         cross_x + cross_size//4, cross_y + cross_size],
        fill=COLOR_GREEN
    )
    
    img.save(os.path.join(ASSETS_DIR, "icon.png"), 'PNG')
    print("✓ Created icon.png (1024x1024)")

def create_adaptive_icon():
    """Create Android adaptive icon (foreground only)"""
    size = 108
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Draw heart in center (safe zone is 72x72)
    heart_size = 35
    heart_x = center
    heart_y = center - 5
    
    points = []
    for angle in range(0, 360, 10):
        rad = math.radians(angle)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    # Add small plus
    plus_size = 8
    draw.rectangle(
        [center - plus_size, center + 15 - 2,
         center + plus_size, center + 15 + 2],
        fill=COLOR_GREEN
    )
    draw.rectangle(
        [center - 2, center + 15 - plus_size,
         center + 2, center + 15 + plus_size],
        fill=COLOR_GREEN
    )
    
    img.save(os.path.join(ASSETS_DIR, "adaptive-icon.png"), 'PNG')
    print("✓ Created adaptive-icon.png (108x108)")

def create_favicon():
    """Create web favicon"""
    size = 192
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Background circle
    radius = size // 2 - 10
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=COLOR_GREEN
    )
    
    # White inner circle
    inner_radius = radius - 15
    draw.ellipse(
        [center - inner_radius, center - inner_radius,
         center + inner_radius, center + inner_radius],
        fill=COLOR_WHITE
    )
    
    # Simple heart icon
    heart_size = inner_radius * 0.8
    heart_x = center
    heart_y = center - 5
    
    points = []
    for angle in range(0, 360, 15):
        rad = math.radians(angle)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    img.save(os.path.join(ASSETS_DIR, "favicon.png"), 'PNG')
    print("✓ Created favicon.png (192x192)")

def create_splash_icon():
    """Create splash screen icon"""
    size = 1280
    img = Image.new('RGBA', (size, size), COLOR_WHITE)
    draw = ImageDraw.Draw(img)
    
    # Create gradient background
    center = size // 2
    
    # Draw gradient circles
    for i in range(center, 0, -20):
        ratio = (center - i) / center
        r = int(COLOR_BEIGE[0] * (1 - ratio) + COLOR_GREEN[0] * ratio)
        g = int(COLOR_BEIGE[1] * (1 - ratio) + COLOR_GREEN[1] * ratio)
        b = int(COLOR_BEIGE[2] * (1 - ratio) + COLOR_GREEN[2] * ratio)
        
        draw.ellipse(
            [center - i, center - i, center + i, center + i],
            fill=(r, g, b, 255)
        )
    
    # Draw large heart
    heart_size = center * 0.6
    heart_x = center
    heart_y = center - 100
    
    points = []
    for angle in range(0, 360, 3):
        rad = math.radians(angle)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    # Add app name text
    try:
        # Try to use a nice font, fall back to default if not available
        font_large = ImageFont.truetype("arial.ttf", 120)
        font_small = ImageFont.truetype("arial.ttf", 60)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw "CareTrek"
    text = "CareTrek"
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_x = (size - text_width) // 2
    text_y = center + 200
    
    draw.text((text_x, text_y), text, fill=COLOR_GREEN, font=font_large)
    
    # Draw tagline
    tagline = "Bridging Generations"
    bbox = draw.textbbox((0, 0), tagline, font=font_small)
    tag_width = bbox[2] - bbox[0]
    tag_x = (size - tag_width) // 2
    tag_y = text_y + 150
    
    draw.text((tag_x, tag_y), tagline, fill=COLOR_ORANGE, font=font_small)
    
    img.save(os.path.join(ASSETS_DIR, "splash-icon.png"), 'PNG')
    print("✓ Created splash-icon.png (1280x1280)")

def create_notification_icon():
    """Create notification icon (small)"""
    size = 192
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Draw background circle
    radius = size // 2 - 10
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=COLOR_ORANGE
    )
    
    # Draw white plus sign
    line_width = 20
    line_length = radius - 20
    
    # Horizontal
    draw.rectangle(
        [center - line_length, center - line_width//2,
         center + line_length, center + line_width//2],
        fill=COLOR_WHITE
    )
    # Vertical
    draw.rectangle(
        [center - line_width//2, center - line_length,
         center + line_width//2, center + line_length],
        fill=COLOR_WHITE
    )
    
    img.save(os.path.join(ASSETS_DIR, "notification-icon.png"), 'PNG')
    print("✓ Created notification-icon.png (192x192)")

def create_app_store_icon():
    """Create app store icon (rounded square)"""
    size = 1024
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded square background
    radius = 200
    margin = 20
    
    # Create rounded rectangle
    for i in range(radius):
        ratio = i / radius
        r = int(COLOR_GREEN[0] * (1 - ratio) + COLOR_BEIGE[0] * ratio)
        g = int(COLOR_GREEN[1] * (1 - ratio) + COLOR_BEIGE[1] * ratio)
        b = int(COLOR_GREEN[2] * (1 - ratio) + COLOR_BEIGE[2] * ratio)
        
        # Draw rounded corners
        draw.arc([margin + i, margin + i, size - margin - i, size - margin - i],
                0, 360, fill=(r, g, b, 255), width=1)
    
    # Fill the main area
    draw.rectangle(
        [margin + radius, margin, size - margin - radius, size - margin],
        fill=COLOR_GREEN
    )
    draw.rectangle(
        [margin, margin + radius, size - margin, size - margin - radius],
        fill=COLOR_GREEN
    )
    
    # Draw heart in center
    center = size // 2
    heart_size = 300
    heart_x = center
    heart_y = center - 50
    
    points = []
    for angle in range(0, 360, 2):
        rad = math.radians(angle)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    img.save(os.path.join(ASSETS_DIR, "app-store-icon.png"), 'PNG')
    print("✓ Created app-store-icon.png (1024x1024)")

def create_banner_icon():
    """Create banner/header icon"""
    width, height = 1200, 400
    img = Image.new('RGBA', (width, height), COLOR_WHITE)
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    for x in range(width):
        ratio = x / width
        r = int(COLOR_BEIGE[0] * (1 - ratio) + COLOR_GREEN[0] * ratio)
        g = int(COLOR_BEIGE[1] * (1 - ratio) + COLOR_GREEN[1] * ratio)
        b = int(COLOR_BEIGE[2] * (1 - ratio) + COLOR_GREEN[2] * ratio)
        
        draw.line([(x, 0), (x, height)], fill=(r, g, b, 255))
    
    # Draw heart on left
    heart_size = 150
    heart_x = 150
    heart_y = 200
    
    points = []
    for angle in range(0, 360, 5):
        rad = math.radians(angle)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = heart_size / 20
        points.append((heart_x + x * scale, heart_y - y * scale))
    
    draw.polygon(points, fill=COLOR_ORANGE, outline=COLOR_ORANGE)
    
    img.save(os.path.join(ASSETS_DIR, "banner-icon.png"), 'PNG')
    print("✓ Created banner-icon.png (1200x400)")

def main():
    """Generate all creative icons"""
    print("🎨 Creating beautiful CareTrek icons...\n")
    
    try:
        create_main_icon()
        create_adaptive_icon()
        create_favicon()
        create_splash_icon()
        create_notification_icon()
        create_app_store_icon()
        create_banner_icon()
        
        print("\n✅ All creative icons generated successfully!")
        print("\nGenerated files:")
        print("  • icon.png (1024x1024) - Main app icon")
        print("  • adaptive-icon.png (108x108) - Android adaptive icon")
        print("  • favicon.png (192x192) - Web favicon")
        print("  • splash-icon.png (1280x1280) - Splash screen")
        print("  • notification-icon.png (192x192) - Notifications")
        print("  • app-store-icon.png (1024x1024) - App store")
        print("  • banner-icon.png (1200x400) - Header banner")
        
    except Exception as e:
        print(f"❌ Error creating icons: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
