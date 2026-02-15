"""
Image Optimization Script for CrownMania
-----------------------------------------
This script helps optimize images hosted on Firebase Storage by:
1. Downloading the current images
2. Compressing them using PIL/Pillow
3. Providing instructions for re-uploading to Firebase

Note: You'll need to manually upload the optimized images to Firebase Storage
after running this script.
"""

import os
import requests
from PIL import Image
from io import BytesIO

# Firebase Storage URLs
IMAGES = {
    'durktoy7.webp': 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media',
    'durktoy2.webp': 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media',
    'durktoy1.webp': 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media',
    'durktoy3.webp': 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy3.webp?alt=media',
    'durktoy4.webp': 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media',
}

# Output directory
OUTPUT_DIR = './optimized_images'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_and_optimize(filename, url, quality=85, max_width=1200):
    """Download an image and optimize it"""
    try:
        print(f"\nProcessing {filename}...")
        
        # Download image
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Get original size
        original_size = len(response.content)
        print(f"  Original size: {original_size / 1024:.2f} KB")
        
        # Open image
        img = Image.open(BytesIO(response.content))
        
        # Get original dimensions
        original_width, original_height = img.size
        print(f"  Original dimensions: {original_width}x{original_height}")
        
        # Resize if too large (maintaining aspect ratio)
        if original_width > max_width:
            ratio = max_width / original_width
            new_height = int(original_height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            print(f"  Resized to: {max_width}x{new_height}")
        
        # Save optimized version
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # Convert RGBA to RGB if necessary (for JPEG compatibility)
        if img.mode == 'RGBA':
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[3])
            img = rgb_img
        
        # Save as WebP with optimization
        img.save(output_path, 'WEBP', quality=quality, method=6)
        
        # Get optimized size
        optimized_size = os.path.getsize(output_path)
        print(f"  Optimized size: {optimized_size / 1024:.2f} KB")
        print(f"  Reduction: {((original_size - optimized_size) / original_size * 100):.1f}%")
        print(f"  ✓ Saved to: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error processing {filename}: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("CrownMania Image Optimization Tool")
    print("=" * 60)
    
    # Check if PIL is installed
    try:
        from PIL import Image
    except ImportError:
        print("\n⚠️  Error: Pillow is not installed!")
        print("Please install it with: pip install Pillow requests")
        return
    
    success_count = 0
    total_count = len(IMAGES)
    
    # Process each image
    for filename, url in IMAGES.items():
        if download_and_optimize(filename, url):
            success_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Summary: {success_count}/{total_count} images optimized successfully")
    print("=" * 60)
    
    if success_count > 0:
        print(f"\n✓ Optimized images saved to: {OUTPUT_DIR}")
        print("\n📋 Next Steps:")
        print("1. Review the optimized images in the './optimized_images' folder")
        print("2. Upload them to Firebase Storage (replace the existing images)")
        print("3. Clear browser cache to see the improvements")
        print("\nTo upload to Firebase Storage:")
        print("  - Go to: https://console.firebase.google.com/")
        print("  - Navigate to Storage > images/")
        print("  - Upload the optimized files (they'll replace the old ones)")

if __name__ == '__main__':
    main()
