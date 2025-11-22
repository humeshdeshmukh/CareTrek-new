import os
from PIL import Image

def generate_assets():
    source_path = r"d:\CareTrek-new\assets\ChatGPT Image Nov 6, 2025, 07_19_20 PM.png"
    assets_dir = r"d:\CareTrek-new\assets"
    
    if not os.path.exists(source_path):
        print(f"Source image not found at {source_path}")
        return

    try:
        img = Image.open(source_path)
        print(f"Opened source image: {img.size}")

        # 1. icon.png (1024x1024)
        icon_size = (1024, 1024)
        icon = img.resize(icon_size, Image.Resampling.LANCZOS)
        icon.save(os.path.join(assets_dir, "icon.png"))
        print("Generated icon.png")

        # 2. adaptive-icon.png (1024x1024, but logo should be centered)
        # For adaptive icon, we often want some padding so the circle crop doesn't cut the logo.
        # Let's make the logo 70% of the canvas.
        adaptive_size = (1024, 1024)
        adaptive_bg = Image.new("RGBA", adaptive_size, (255, 255, 255, 0)) # Transparent bg, or white? App.json says white.
        # app.json: "backgroundColor": "#ffffff"
        # So let's make it transparent here and let the background color handle it, OR make it white.
        # Safest is transparent if the logo is shaped, but if it's a full square logo, just resizing is fine.
        # Assuming the source is the logo itself.
        
        # Let's resize logo to fit within safe area (approx 66% or 720px)
        logo_target_size = (720, 720)
        logo_resized = img.resize(logo_target_size, Image.Resampling.LANCZOS)
        
        # Center it
        offset = ((adaptive_size[0] - logo_target_size[0]) // 2, (adaptive_size[1] - logo_target_size[1]) // 2)
        adaptive_bg.paste(logo_resized, offset)
        adaptive_bg.save(os.path.join(assets_dir, "adaptive-icon.png"))
        print("Generated adaptive-icon.png")

        # 3. splash-icon.png
        # Similar to adaptive, usually just the logo centered.
        # Expo recommends 200px width for splash icon on some densities, but high res is better.
        # We can use the same as adaptive-icon or just the icon itself if it's circular/shaped.
        # Let's use the same logic as adaptive for safety.
        adaptive_bg.save(os.path.join(assets_dir, "splash-icon.png"))
        print("Generated splash-icon.png")

    except Exception as e:
        print(f"Error generating assets: {e}")

if __name__ == "__main__":
    generate_assets()
