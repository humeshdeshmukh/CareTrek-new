#!/usr/bin/env python3
"""
Create professional, designer-quality icons for CareTrek
Modern, minimalist design with premium aesthetics
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os

ASSETS_DIR = "assets"

# Premium theme colors
COLOR_PRIMARY = (91, 155, 110)        # Sage Green
COLOR_SECONDARY = (212, 132, 92)      # Warm Orange
COLOR_ACCENT = (232, 213, 196)        # Warm Beige
COLOR_WHITE = (255, 255, 255)
COLOR_DARK = (30, 30, 30)
COLOR_GRAY = (120, 120, 120)
COLOR_LIGHT_GRAY = (240, 240, 240)

def apply_shadow(img, offset=(4, 4), blur=10, opacity=0.3):
    """Apply drop shadow to image"""
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    
    # Create shadow
    alpha = int(255 * opacity)
    shadow_img = Image.new('RGBA', img.size, (0, 0, 0, alpha))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=blur))
    
    # Offset shadow
    shadow.paste(shadow_img, offset, shadow_img)
    
    # Composite
    result = Image.new('RGBA', img.size, (255, 255, 255, 0))
    result.paste(shadow, (0, 0), shadow)
    result.paste(img, (0, 0), img)
    
    return result

def draw_smooth_circle(draw, center, radius, fill=None, outline=None, width=1):
    """Draw a smooth circle"""
    x, y = center
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], 
                 fill=fill, outline=outline, width=width)

def draw_smooth_heart(draw, center, size, fill=None, outline=None):
    """Draw a smooth heart shape"""
    x, y = center
    points = []
    
    for angle in range(0, 360, 2):
        rad = math.radians(angle)
        hx = 16 * math.sin(rad) ** 3
        hy = 13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)
        
        scale = size / 20
        points.append((x + hx * scale, y - hy * scale))
    
    if len(points) > 2:
        draw.polygon(points, fill=fill, outline=outline)

def create_professional_main_icon():
    """Create professional main app icon"""
    size = 1024
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Create sophisticated gradient background
    # Outer circle - gradient from primary to accent
    for i in range(center, 0, -2):
        ratio = (center - i) / center
        r = int(COLOR_PRIMARY[0] * (1 - ratio) + COLOR_ACCENT[0] * ratio)
        g = int(COLOR_PRIMARY[1] * (1 - ratio) + COLOR_ACCENT[1] * ratio)
        b = int(COLOR_PRIMARY[2] * (1 - ratio) + COLOR_ACCENT[2] * ratio)
        
        draw.ellipse([center - i, center - i, center + i, center + i],
                    fill=(r, g, b, 255))
    
    # Inner white circle with subtle shadow effect
    inner_radius = int(center * 0.75)
    
    # Shadow circle
    shadow_radius = inner_radius + 15
    draw.ellipse([center - shadow_radius, center - shadow_radius,
                 center + shadow_radius, center + shadow_radius],
                fill=(0, 0, 0, 15))
    
    # Main white circle
    draw.ellipse([center - inner_radius, center - inner_radius,
                 center + inner_radius, center + inner_radius],
                fill=COLOR_WHITE)
    
    # Draw premium heart with gradient effect
    heart_size = inner_radius * 0.5
    heart_x = center
    heart_y = center - 80
    
    # Heart outline (darker)
    draw_smooth_heart(draw, (heart_x, heart_y), heart_size * 1.05,
                     fill=None, outline=COLOR_SECONDARY)
    
    # Heart fill (gradient effect with multiple layers)
    for i in range(int(heart_size * 1.05), int(heart_size * 0.8), -2):
        ratio = (heart_size * 1.05 - i) / (heart_size * 0.25)
        r = int(COLOR_SECONDARY[0] * (1 - ratio * 0.2))
        g = int(COLOR_SECONDARY[1] * (1 - ratio * 0.2))
        b = int(COLOR_SECONDARY[2] * (1 - ratio * 0.2))
        
        draw_smooth_heart(draw, (heart_x, heart_y), i,
                         fill=(r, g, b, 255), outline=None)
    
    # Draw medical cross (health indicator)
    cross_size = inner_radius * 0.25
    cross_x = center + inner_radius * 0.35
    cross_y = center + inner_radius * 0.35
    cross_width = 12
    
    # Horizontal bar
    draw.rectangle([cross_x - cross_size, cross_y - cross_width//2,
                   cross_x + cross_size, cross_y + cross_width//2],
                  fill=COLOR_PRIMARY)
    
    # Vertical bar
    draw.rectangle([cross_x - cross_width//2, cross_y - cross_size,
                   cross_x + cross_width//2, cross_y + cross_size],
                  fill=COLOR_PRIMARY)
    
    # Add decorative circles around heart
    for angle in [0, 90, 180, 270]:
        rad = math.radians(angle)
        dot_x = heart_x + math.cos(rad) * (heart_size + 100)
        dot_y = heart_y + math.sin(rad) * (heart_size + 100)
        draw.ellipse([dot_x - 15, dot_y - 15, dot_x + 15, dot_y + 15],
                    fill=COLOR_ACCENT)
    
    img.save(os.path.join(ASSETS_DIR, "icon.png"), 'PNG')
    print("✓ Created professional icon.png (1024x1024)")

def create_professional_adaptive_icon():
    """Create professional Android adaptive icon"""
    size = 108
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Draw heart in safe zone (72x72 center)
    heart_size = 28
    heart_x = center
    heart_y = center - 3
    
    # Heart with gradient
    for i in range(int(heart_size), int(heart_size * 0.6), -1):
        ratio = (heart_size - i) / (heart_size * 0.4)
        r = int(COLOR_SECONDARY[0] * (1 - ratio * 0.15))
        g = int(COLOR_SECONDARY[1] * (1 - ratio * 0.15))
        b = int(COLOR_SECONDARY[2] * (1 - ratio * 0.15))
        
        draw_smooth_heart(draw, (heart_x, heart_y), i,
                         fill=(r, g, b, 255), outline=None)
    
    # Small plus below
    plus_size = 6
    plus_y = center + 18
    draw.rectangle([center - plus_size, plus_y - 2,
                   center + plus_size, plus_y + 2],
                  fill=COLOR_PRIMARY)
    draw.rectangle([center - 2, plus_y - plus_size,
                   center + 2, plus_y + plus_size],
                  fill=COLOR_PRIMARY)
    
    img.save(os.path.join(ASSETS_DIR, "adaptive-icon.png"), 'PNG')
    print("✓ Created professional adaptive-icon.png (108x108)")

def create_professional_favicon():
    """Create professional web favicon"""
    size = 192
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = size // 2 - 8
    
    # Gradient background circle
    for i in range(radius, 0, -2):
        ratio = (radius - i) / radius
        r = int(COLOR_PRIMARY[0] * (1 - ratio) + COLOR_ACCENT[0] * ratio)
        g = int(COLOR_PRIMARY[1] * (1 - ratio) + COLOR_ACCENT[1] * ratio)
        b = int(COLOR_PRIMARY[2] * (1 - ratio) + COLOR_ACCENT[2] * ratio)
        
        draw.ellipse([center - i, center - i, center + i, center + i],
                    fill=(r, g, b, 255))
    
    # White inner circle
    inner_radius = radius - 18
    draw.ellipse([center - inner_radius, center - inner_radius,
                 center + inner_radius, center + inner_radius],
                fill=COLOR_WHITE)
    
    # Heart icon
    heart_size = inner_radius * 0.65
    draw_smooth_heart(draw, (center, center - 15), heart_size,
                     fill=COLOR_SECONDARY, outline=COLOR_SECONDARY)
    
    img.save(os.path.join(ASSETS_DIR, "favicon.png"), 'PNG')
    print("✓ Created professional favicon.png (192x192)")

def create_professional_splash():
    """Create professional splash screen"""
    width, height = 1280, 1280
    img = Image.new('RGBA', (width, height), COLOR_WHITE)
    draw = ImageDraw.Draw(img)
    
    center_x = width // 2
    center_y = height // 2
    
    # Create radial gradient background
    max_radius = int(math.sqrt(center_x**2 + center_y**2)) + 100
    
    for i in range(max_radius, 0, -20):
        ratio = i / max_radius
        r = int(COLOR_ACCENT[0] * (1 - ratio) + COLOR_PRIMARY[0] * ratio)
        g = int(COLOR_ACCENT[1] * (1 - ratio) + COLOR_PRIMARY[1] * ratio)
        b = int(COLOR_ACCENT[2] * (1 - ratio) + COLOR_PRIMARY[2] * ratio)
        
        draw.ellipse([center_x - i, center_y - i, center_x + i, center_y + i],
                    fill=(r, g, b, 255))
    
    # Large heart
    heart_size = 300
    heart_x = center_x
    heart_y = center_y - 150
    
    # Heart with shadow
    for offset in [8, 4, 0]:
        alpha = 255 if offset == 0 else int(255 * (1 - offset / 12))
        for i in range(int(heart_size), int(heart_size * 0.7), -2):
            ratio = (heart_size - i) / (heart_size * 0.3)
            r = int(COLOR_SECONDARY[0] * (1 - ratio * 0.1))
            g = int(COLOR_SECONDARY[1] * (1 - ratio * 0.1))
            b = int(COLOR_SECONDARY[2] * (1 - ratio * 0.1))
            
            draw_smooth_heart(draw, (heart_x + offset, heart_y + offset), i,
                             fill=(r, g, b, alpha), outline=None)
    
    # App name with professional typography
    try:
        font_title = ImageFont.truetype("arial.ttf", 140)
        font_subtitle = ImageFont.truetype("arial.ttf", 50)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
    
    # "CareTrek" text
    text = "CareTrek"
    bbox = draw.textbbox((0, 0), text, font=font_title)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = center_y + 250
    
    # Text shadow
    draw.text((text_x + 3, text_y + 3), text, fill=(0, 0, 0, 50), font=font_title)
    # Text
    draw.text((text_x, text_y), text, fill=COLOR_PRIMARY, font=font_title)
    
    # Tagline
    tagline = "Bridging Generations"
    bbox = draw.textbbox((0, 0), tagline, font=font_subtitle)
    tag_width = bbox[2] - bbox[0]
    tag_x = (width - tag_width) // 2
    tag_y = text_y + 180
    
    draw.text((tag_x, tag_y), tagline, fill=COLOR_SECONDARY, font=font_subtitle)
    
    img.save(os.path.join(ASSETS_DIR, "splash-icon.png"), 'PNG')
    print("✓ Created professional splash-icon.png (1280x1280)")

def create_professional_notification_icon():
    """Create professional notification icon"""
    size = 192
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = size // 2 - 12
    
    # Gradient circle background
    for i in range(radius, 0, -2):
        ratio = (radius - i) / radius
        r = int(COLOR_SECONDARY[0] * (1 - ratio * 0.3))
        g = int(COLOR_SECONDARY[1] * (1 - ratio * 0.3))
        b = int(COLOR_SECONDARY[2] * (1 - ratio * 0.3))
        
        draw.ellipse([center - i, center - i, center + i, center + i],
                    fill=(r, g, b, 255))
    
    # White plus sign
    plus_size = radius - 30
    line_width = 20
    
    # Horizontal
    draw.rectangle([center - plus_size, center - line_width//2,
                   center + plus_size, center + line_width//2],
                  fill=COLOR_WHITE)
    # Vertical
    draw.rectangle([center - line_width//2, center - plus_size,
                   center + line_width//2, center + plus_size],
                  fill=COLOR_WHITE)
    
    img.save(os.path.join(ASSETS_DIR, "notification-icon.png"), 'PNG')
    print("✓ Created professional notification-icon.png (192x192)")

def create_professional_app_store_icon():
    """Create professional app store icon with rounded corners"""
    size = 1024
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Rounded square with gradient
    radius = 200
    margin = 20
    
    # Create gradient rounded square
    for i in range(radius, 0, -2):
        ratio = i / radius
        r = int(COLOR_PRIMARY[0] * (1 - ratio) + COLOR_ACCENT[0] * ratio)
        g = int(COLOR_PRIMARY[1] * (1 - ratio) + COLOR_ACCENT[1] * ratio)
        b = int(COLOR_PRIMARY[2] * (1 - ratio) + COLOR_ACCENT[2] * ratio)
        
        # Draw rounded corners
        draw.arc([margin + i, margin + i, size - margin - i, size - margin - i],
                0, 360, fill=(r, g, b, 255), width=2)
    
    # Fill main area
    draw.rectangle([margin + radius, margin, size - margin - radius, size - margin],
                  fill=COLOR_PRIMARY)
    draw.rectangle([margin, margin + radius, size - margin, size - margin - radius],
                  fill=COLOR_PRIMARY)
    
    # Center heart
    center = size // 2
    heart_size = 350
    
    # Heart with multiple layers for depth
    for i in range(int(heart_size), int(heart_size * 0.7), -3):
        ratio = (heart_size - i) / (heart_size * 0.3)
        r = int(COLOR_SECONDARY[0] * (1 - ratio * 0.2))
        g = int(COLOR_SECONDARY[1] * (1 - ratio * 0.2))
        b = int(COLOR_SECONDARY[2] * (1 - ratio * 0.2))
        
        draw_smooth_heart(draw, (center, center - 80), i,
                         fill=(r, g, b, 255), outline=None)
    
    img.save(os.path.join(ASSETS_DIR, "app-store-icon.png"), 'PNG')
    print("✓ Created professional app-store-icon.png (1024x1024)")

def create_professional_banner():
    """Create professional banner/header icon"""
    width, height = 1200, 400
    img = Image.new('RGBA', (width, height), COLOR_WHITE)
    draw = ImageDraw.Draw(img)
    
    # Horizontal gradient background
    for x in range(width):
        ratio = x / width
        r = int(COLOR_ACCENT[0] * (1 - ratio) + COLOR_PRIMARY[0] * ratio)
        g = int(COLOR_ACCENT[1] * (1 - ratio) + COLOR_PRIMARY[1] * ratio)
        b = int(COLOR_ACCENT[2] * (1 - ratio) + COLOR_PRIMARY[2] * ratio)
        
        draw.line([(x, 0), (x, height)], fill=(r, g, b, 255))
    
    # Left side - heart
    heart_size = 120
    heart_x = 150
    heart_y = height // 2
    
    draw_smooth_heart(draw, (heart_x, heart_y), heart_size,
                     fill=COLOR_SECONDARY, outline=COLOR_SECONDARY)
    
    # Right side - text
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except:
        font = ImageFont.load_default()
    
    text = "CareTrek"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = width - text_width - 100
    text_y = (height - (bbox[3] - bbox[1])) // 2
    
    draw.text((text_x, text_y), text, fill=COLOR_WHITE, font=font)
    
    img.save(os.path.join(ASSETS_DIR, "banner-icon.png"), 'PNG')
    print("✓ Created professional banner-icon.png (1200x400)")

def create_professional_logo_variant():
    """Create professional logo variant"""
    size = 512
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Outer circle
    radius = size // 2 - 20
    for i in range(radius, 0, -2):
        ratio = (radius - i) / radius
        r = int(COLOR_PRIMARY[0] * (1 - ratio) + COLOR_ACCENT[0] * ratio)
        g = int(COLOR_PRIMARY[1] * (1 - ratio) + COLOR_ACCENT[1] * ratio)
        b = int(COLOR_PRIMARY[2] * (1 - ratio) + COLOR_ACCENT[2] * ratio)
        
        draw.ellipse([center - i, center - i, center + i, center + i],
                    fill=(r, g, b, 255))
    
    # Inner white circle
    inner_radius = radius - 40
    draw.ellipse([center - inner_radius, center - inner_radius,
                 center + inner_radius, center + inner_radius],
                fill=COLOR_WHITE)
    
    # Heart
    heart_size = inner_radius * 0.6
    draw_smooth_heart(draw, (center, center - 30), heart_size,
                     fill=COLOR_SECONDARY, outline=COLOR_SECONDARY)
    
    # Plus
    plus_size = inner_radius * 0.25
    plus_x = center + inner_radius * 0.3
    plus_y = center + inner_radius * 0.3
    
    draw.rectangle([plus_x - plus_size, plus_y - 8,
                   plus_x + plus_size, plus_y + 8],
                  fill=COLOR_PRIMARY)
    draw.rectangle([plus_x - 8, plus_y - plus_size,
                   plus_x + 8, plus_y + plus_size],
                  fill=COLOR_PRIMARY)
    
    img.save(os.path.join(ASSETS_DIR, "logo-variant.png"), 'PNG')
    print("✓ Created professional logo-variant.png (512x512)")

def main():
    """Generate all professional icons"""
    print("🎨 Creating professional designer-quality icons...\n")
    
    try:
        create_professional_main_icon()
        create_professional_adaptive_icon()
        create_professional_favicon()
        create_professional_splash()
        create_professional_notification_icon()
        create_professional_app_store_icon()
        create_professional_banner()
        create_professional_logo_variant()
        
        print("\n✅ All professional icons created successfully!")
        print("\n📦 Generated Premium Icon Set:")
        print("  ✓ icon.png (1024x1024) - Main app icon")
        print("  ✓ adaptive-icon.png (108x108) - Android adaptive")
        print("  ✓ favicon.png (192x192) - Web favicon")
        print("  ✓ splash-icon.png (1280x1280) - Splash screen")
        print("  ✓ notification-icon.png (192x192) - Notifications")
        print("  ✓ app-store-icon.png (1024x1024) - App store")
        print("  ✓ banner-icon.png (1200x400) - Header banner")
        print("  ✓ logo-variant.png (512x512) - Logo variant")
        print("\n🎯 Design Features:")
        print("  • Gradient backgrounds with smooth transitions")
        print("  • Professional color palette (Green, Orange, Beige)")
        print("  • Layered heart design with depth")
        print("  • Medical cross symbol for health theme")
        print("  • Decorative elements and shadows")
        print("  • Optimized for all platforms")
        
    except Exception as e:
        print(f"❌ Error creating icons: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
