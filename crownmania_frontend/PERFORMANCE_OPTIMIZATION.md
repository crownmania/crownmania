# Performance Optimization Guide for CrownMania Vault

This document outlines all performance optimizations implemented for the Vault section.

## 🚀 Optimizations Implemented

### 1. 3D Model Lazy Loading ✅

**What was done:**
- Changed `DurkModel` from a normal import to a lazy import using React's `lazy()` function
- Updated the `Suspense` fallback to show a loading spinner with "LOADING 3D MODEL..." text
- Added code splitting for the 3D model component

**Benefits:**
- Reduces initial bundle size
- 3D model only loads when needed
- Improves First Contentful Paint (FCP) and Time to Interactive (TTI)
- Better user experience with loading feedback

**Code changes:**
```jsx
// Before:
import { DurkModel } from './3d/DurkModel';

// After:
const DurkModel = lazy(() => import('./3d/DurkModel').then(module => ({ default: module.DurkModel })));
```

---

### 2. Image Lazy Loading ✅

**What was done:**
- Added `loading="lazy"` attribute to all character images
- Added `decoding="async"` attribute for asynchronous image decoding
- Applied to 3 key images:
  - Character grid preview (`DURK_FACE_IMG`)
  - ID Card back view (`DURK_PREVIEW_IMG`)
  - ID Card front view (`DURK_FRONT_IMG`)

**Benefits:**
- Images only load when they're about to enter the viewport
- Reduces initial page load time
- Saves bandwidth for users who don't scroll to images
- Browser handles decoding asynchronously without blocking the main thread

**Code changes:**
```jsx
// Before:
<img src={DURK_FACE_IMG} alt="Lil Durk" />

// After:
<img src={DURK_FACE_IMG} alt="Lil Durk" loading="lazy" decoding="async" />
```

---

### 3. Image Optimization Script 📄

**What was created:**
- Python script: `optimize_images.py`
- Automatically downloads images from Firebase Storage
- Compresses them using Pillow with WebP format
- Maintains quality while reducing file size

**How to use:**

1. **Install dependencies:**
   ```bash
   pip install Pillow requests
   ```

2. **Run the script:**
   ```bash
   python optimize_images.py
   ```

3. **Upload optimized images:**
   - Review images in `./optimized_images/` folder
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to Storage > images/
   - Upload the optimized files (replace existing ones)

**Expected results:**
- 30-60% file size reduction
- Images resized to max 1200px width (maintaining aspect ratio)
- WebP quality set to 85 (excellent quality/size balance)

---

## 📊 Performance Metrics

### Before Optimization:
- Initial bundle includes full 3D model
- All images load immediately
- Large image file sizes from Firebase

### After Optimization:
- ✅ 3D model loads on-demand (code splitting)
- ✅ Images load when visible (lazy loading)
- ✅ Loading indicators provide feedback
- ✅ Smaller image files (after running optimization script)

---

## 🎯 Expected Performance Improvements

| Metric | Improvement |
|--------|-------------|
| **Initial Bundle Size** | -20% to -30% (3D model separated) |
| **First Contentful Paint** | -500ms to -1s faster |
| **Time to Interactive** | -300ms to -800ms faster |
| **Image Load Time** | -30% to -60% (after compression) |
| **Lighthouse Score** | +10 to +20 points |

---

## 🔧 Additional Optimization Opportunities

### Future Enhancements:

1. **CDN Integration**
   - Move images to Cloudflare or similar CDN
   - Enable automatic image optimization
   - Serve WebP/AVIF based on browser support

2. **Progressive Image Loading**
   - Implement blur-up technique with base64 placeholders
   - Use low-quality image placeholders (LQIP)

3. **HTTP/2 Server Push**
   - Pre-push critical assets
   - Reduce round-trip times

4. **Service Worker Caching**
   - Cache 3D model and images for offline access
   - Implement stale-while-revalidate strategy

5. **Image Sprites**
   - Combine multiple small images into sprites
   - Reduce HTTP requests

6. **WebP/AVIF Format**
   - Already using WebP ✅
   - Consider AVIF for even better compression (future)

---

## 🧪 Testing Performance

### Manual Testing:
1. Open Chrome DevTools
2. Go to Network tab
3. Throttle to "Fast 3G"
4. Reload page and observe:
   - 3D model loads separately
   - Images load as you scroll
   - Loading spinners appear

### Performance Audit:
```bash
# Run Lighthouse audit
npm run build
npx serve -s dist
# Open Chrome DevTools > Lighthouse > Run audit
```

### Metrics to Monitor:
- **FCP (First Contentful Paint)**: Should be < 1.8s
- **LCP (Largest Contentful Paint)**: Should be < 2.5s
- **TBT (Total Blocking Time)**: Should be < 200ms
- **CLS (Cumulative Layout Shift)**: Should be < 0.1

---

## 📝 Notes

- The 3D model is the largest asset, so lazy loading it provides the most benefit
- Image lazy loading is browser-native and highly optimized
- The optimization script is safe to run multiple times
- Always preview optimized images before uploading to ensure quality

---

## ✅ Checklist

- [x] 3D model lazy loading implemented
- [x] Image lazy loading attributes added
- [x] Loading spinner UI created
- [x] Image optimization script created
- [ ] Run image optimization script
- [ ] Upload optimized images to Firebase
- [ ] Test performance on slow connection
- [ ] Run Lighthouse audit
- [ ] Monitor production metrics

---

**Last Updated:** February 11, 2026
