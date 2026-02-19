# 🧪 MANUAL TESTING GUIDE - CrownMania Vault
**Created:** February 4, 2026, 7:43 AM  
**Status:** READY FOR MANUAL TESTING

---

## ⚡ **QUICK START - Test in 5 Minutes**

### **Step 1: Open the Application**
1. Open your browser (Chrome recommended)
2. Navigate to: **http://localhost:5173**
3. Wait for page to load completely

### **Step 2: Find the Vault Section**
1. Scroll down the page
2. Look for "THE VAULT" heading
3. You should see:
   - Artist name: "LIL DURK"
   - Artist details (Origin, Birthday, Height, Weight)
   - **NEW: 4 Social Media Icons** (Twitter, Instagram, YouTube, TikTok)
   - Character grid with Durk's face
   - ID card with front/back images
   - 3D model viewer
   - Verification input field

### **Step 3: Test Social Media Icons** ⭐ NEW FEATURE
1. Locate the 4 circular icons below artist details
2. Hover over each icon:
   - **Twitter** → Should glow BLUE (#1DA1F2)
   - **Instagram** → Should glow PINK (#E1306C)
   - **YouTube** → Should glow RED (#FF0000)
   - **TikTok** → Should glow CYAN (#00F2EA)
3. Click any icon → Should open in new tab

**✅ PASS CRITERIA:**
- All 4 icons visible
- Hover effects work smoothly
- Icons lift up on hover
- Correct colors on hover
- Links open in new tabs

---

### **Step 4: Test Verification Flow**

**BEFORE VERIFICATION - Check Initial State:**
- [ ] Durk images in ID card are GRAYSCALE
- [ ] Character grid image is GRAYSCALE
- [ ] Status shows "ASSET LOCKED" with lock icon
- [ ] UI elements (buttons, borders) are COLORFUL

**PERFORM VERIFICATION:**
1. Click on the input field
2. Paste this code: `74225f9edd724544acfcda78e7c09303`
3. Click "VERIFY CODE" button
4. Watch carefully for 2-3 seconds

**AFTER VERIFICATION - Expected Results:**
- [ ] Success message appears (green checkmark)
- [ ] Images smoothly transition from grayscale → FULL COLOR (1.5 seconds)
- [ ] Status changes to "ASSET VERIFIED" with checkmark
- [ ] "Verified On" date appears (e.g., "Feb 4, 2026 at 7:43 AM")
- [ ] UI elements (buttons, borders, social icons) STAY COLORFUL
- [ ] No console errors (press F12 to check)

---

### **Step 5: Test Persistence**
1. Press **F5** to refresh the page
2. Scroll back to vault
3. **Expected:** Images should STILL be colorful
4. **Expected:** "Verified On" date should STILL show
5. **Expected:** Status should STILL be "ASSET VERIFIED"

---

### **Step 6: Test Already Claimed Code**
1. Clear the input field
2. Enter this code: `d1933d38167b4686857b5c2cf7ded774`
3. Click "VERIFY CODE"

**Expected Results:**
- [ ] Message: "This product is authentic but has already been claimed"
- [ ] Edition shows: "#6 / 500"
- [ ] Original claim date shows (Jan 8, 2026)
- [ ] Images STILL transition to color

---

## 🐛 **DEBUGGING CHECKLIST**

### **If Verification Fails:**
1. **Open Browser Console** (F12)
2. **Look for red errors**
3. **Common issues:**
   - ❌ "verifySerial is not a function" → API file issue
   - ❌ "Failed to fetch" → Backend not running
   - ❌ "CORS error" → API URL wrong
   - ❌ "Maximum update depth exceeded" → Infinite loop

### **If Images Don't Change Color:**
1. **Check browser console for errors**
2. **Verify in DevTools:**
   - Right-click on an image → Inspect
   - Look for `filter: grayscale(...)` in styles
   - Should change to `filter: none saturate(1.1)` after verification
3. **Check if `isAssetVerified` is true:**
   - In console, type: `document.querySelector('[class*="status"]').textContent`
   - Should show "ASSET VERIFIED"

### **If Social Icons Missing:**
1. **Check if icons imported correctly**
2. **Look in artist details section**
3. **Should be below Origin/Birthday/Height/Weight**
4. **Check console for import errors**

---

## 📋 **COMPLETE FEATURE CHECKLIST**

### **Visual Elements**
- [ ] Social media icons visible (4 total)
- [ ] Social icons have hover effects
- [ ] Social icons have correct colors
- [ ] Durk images in ID card
- [ ] Character grid slot image
- [ ] 3D model viewer
- [ ] Verification input field
- [ ] Verify button
- [ ] Status badge
- [ ] Edition number display
- [ ] Verified date display

### **Functionality**
- [ ] Serial verification works
- [ ] Invalid code shows error
- [ ] Already claimed code handled
- [ ] Images transition grayscale → color
- [ ] Transition is smooth (1.5s)
- [ ] UI stays colorful throughout
- [ ] Verification persists on refresh
- [ ] localStorage saves data
- [ ] Social links open in new tabs
- [ ] Social links go to correct URLs

### **Performance**
- [ ] Page loads in < 3 seconds
- [ ] No console errors
- [ ] No infinite loops
- [ ] Animations are smooth
- [ ] No layout shifts

---

## 🔧 **QUICK FIXES**

### **Problem: "Verification failed" message**
**Solution:**
1. Check backend is running: http://localhost:5001/health
2. Check `.env` file has: `VITE_API_URL=http://localhost:5001`
3. Restart frontend: `npm run dev`

### **Problem: Infinite loop / page freezes**
**Solution:**
1. Check console for "Maximum update depth exceeded"
2. Clear localStorage: `localStorage.clear()` in console
3. Refresh page

### **Problem: Social icons not showing**
**Solution:**
1. Check imports in Vault.jsx
2. Verify FaTwitter, FaInstagram, FaYoutube, FaTiktok are imported
3. Check if `<SocialMediaLinks>` component is rendered

### **Problem: Images stay grayscale**
**Solution:**
1. Verify `$verified` prop is passed to image components
2. Check `isAssetVerified` state is true
3. Inspect element to see if filter is applied

---

## ✅ **SUCCESS CRITERIA**

**The application is working correctly if:**
1. ✅ All 4 social media icons are visible and functional
2. ✅ Verification flow works without errors
3. ✅ Images transition from grayscale to color smoothly
4. ✅ UI elements stay colorful (buttons, borders, icons)
5. ✅ Verification persists across page refreshes
6. ✅ "Verified On" date displays correctly
7. ✅ No console errors
8. ✅ Social icon hover effects work
9. ✅ Social links open in new tabs
10. ✅ Mobile responsive (test with DevTools)

---

## 📸 **SCREENSHOT CHECKLIST**

Take screenshots of:
1. **Initial state** (before verification, grayscale)
2. **Social media icons** (all 4 visible)
3. **Social icon hover** (showing color change)
4. **After verification** (images in color)
5. **Verified date** (showing in details panel)
6. **Browser console** (showing no errors)
7. **After refresh** (persistence working)

---

## 🚨 **REPORT BUGS HERE**

If you find any issues, document:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Console errors** (if any)
5. **Screenshots** (if applicable)

---

**Ready to test! Open http://localhost:5173 and follow the steps above.** 🚀
