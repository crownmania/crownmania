# 🔍 CrownMania Complete Testing & Debugging Protocol
**Auto-Generated:** February 4, 2026  
**Purpose:** Systematically test and debug every feature of the CrownMania application

---

## 🎯 **Testing Categories**

### **1. VERIFICATION FLOW**
- [ ] QR Code Scanning
- [ ] Manual Serial Entry
- [ ] Invalid Code Handling
- [ ] Already Claimed Code
- [ ] Verification Persistence (localStorage)
- [ ] Verified Date Display
- [ ] Visual Mood Change (Grayscale → Color)

### **2. VISUAL & UI ELEMENTS**
- [ ] Social Media Icons (Twitter, Instagram, YouTube, TikTok)
- [ ] Icon Hover Effects
- [ ] Image Grayscale Transitions
- [ ] 3D Model Display
- [ ] 3D Model Grayscale Effect
- [ ] Button States & Hover
- [ ] Panel Borders & Trim Colors
- [ ] Typography & Fonts

### **3. WEB3 AUTHENTICATION**
- [ ] Web3Auth Modal Opens
- [ ] Wallet Connection
- [ ] Wallet Address Display
- [ ] Disconnect Functionality
- [ ] Signature Verification

### **4. NFT CLAIMING**
- [ ] Claim Button Enabled/Disabled
- [ ] Claim Process
- [ ] Edition Number Display
- [ ] Transaction Hash Display
- [ ] NFT Transfer Status
- [ ] Retry Logic for Failed Transfers

### **5. DATA PERSISTENCE**
- [ ] localStorage Verification
- [ ] Session Persistence
- [ ] Cross-Tab Sync
- [ ] Expiry Logic (30 days)

### **6. API ENDPOINTS**
- [ ] POST /api/verification/verify-serial
- [ ] GET /api/verification/verify-product/:id
- [ ] POST /api/verification/claim
- [ ] GET /api/verification/wallet-tokens/:address
- [ ] GET /api/verification/transfer-status/:serial
- [ ] GET /api/verification/nonce

### **7. RESPONSIVE DESIGN**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### **8. BROWSER COMPATIBILITY**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### **9. ERROR HANDLING**
- [ ] Network Errors
- [ ] API Timeouts
- [ ] Invalid Responses
- [ ] Rate Limiting
- [ ] CORS Issues

### **10. PERFORMANCE**
- [ ] Page Load Time
- [ ] Image Loading
- [ ] 3D Model Loading
- [ ] Animation Smoothness
- [ ] Memory Leaks

---

## 📋 **Detailed Test Cases**

### **TEST 1: Serial Verification (Valid Code)**
**Steps:**
1. Navigate to http://localhost:5173
2. Scroll to Vault section
3. Enter serial: `74225f9edd724544acfcda78e7c09303`
4. Click "VERIFY CODE"

**Expected Results:**
- ✅ Success message appears
- ✅ Images transition from grayscale → color (1.5s)
- ✅ "Verified On" date shows current date
- ✅ Status changes to "ASSET VERIFIED"
- ✅ localStorage updated
- ✅ UI elements stay colorful

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 2: Serial Verification (Invalid Code)**
**Steps:**
1. Enter serial: `invalid123`
2. Click "VERIFY CODE"

**Expected Results:**
- ✅ Error message: "Product not found"
- ✅ Images stay grayscale
- ✅ Status stays "ASSET LOCKED"

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 3: Already Claimed Code**
**Steps:**
1. Enter serial: `d1933d38167b4686857b5c2cf7ded774`
2. Click "VERIFY CODE"

**Expected Results:**
- ✅ Message: "This product is authentic but has already been claimed"
- ✅ Edition number shows: "#6 / 500"
- ✅ Original claim date displays
- ✅ Images still transition to color

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 4: Social Media Icons**
**Steps:**
1. Locate social media icons in artist details section
2. Hover over each icon (Twitter, Instagram, YouTube, TikTok)
3. Click each icon

**Expected Results:**
- ✅ 4 icons visible (Twitter, Instagram, YouTube, TikTok)
- ✅ Hover effect: icon lifts up, border color changes
- ✅ Twitter hover: Blue (#1DA1F2)
- ✅ Instagram hover: Pink (#E1306C)
- ✅ YouTube hover: Red (#FF0000)
- ✅ TikTok hover: Cyan (#00F2EA)
- ✅ Links open in new tab
- ✅ Correct URLs

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 5: Visual Mood Change**
**Steps:**
1. Before verification: Observe vault images
2. Verify a code
3. Watch transition

**Expected Results:**
- ✅ Before: All images grayscale (100%)
- ✅ During: Smooth 1.5s transition
- ✅ After: Full color with 110% saturation
- ✅ UI elements (buttons, borders) stay colorful throughout
- ✅ 3D model transitions (if loaded)

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 6: localStorage Persistence**
**Steps:**
1. Verify a code
2. Refresh page (F5)
3. Close browser completely
4. Reopen and navigate to vault

**Expected Results:**
- ✅ After refresh: Still verified, images colorful
- ✅ After browser restart: Still verified
- ✅ "Verified On" date persists
- ✅ localStorage contains verification data

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 7: Web3Auth Connection**
**Steps:**
1. Click "CONNECT WALLET" button
2. Complete Web3Auth flow
3. Check wallet address display

**Expected Results:**
- ✅ Web3Auth modal opens
- ✅ Login options appear
- ✅ After login: Wallet address shows (truncated)
- ✅ "DISCONNECT" button appears
- ✅ No console errors

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 8: NFT Claim Process**
**Steps:**
1. Verify a code
2. Connect wallet
3. Click "CLAIM" button
4. Wait for response

**Expected Results:**
- ✅ Claim button becomes enabled after verification
- ✅ Loading state during claim
- ✅ Success message with edition number
- ✅ Transaction hash displays
- ✅ Firestore updated

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 9: API Endpoint - Verify Serial**
**Command:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/api/verification/verify-serial" -Method POST -ContentType "application/json" -Body '{"serialNumber": "74225f9edd724544acfcda78e7c09303"}'
```

**Expected Response:**
```json
{
  "verified": true,
  "claimed": false,
  "product": {
    "id": "...",
    "productId": "lil-durk-figure",
    "claimDate": "..."
  }
}
```

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 10: API Endpoint - Transfer Status**
**Command:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/api/verification/transfer-status/d1933d38167b4686857b5c2cf7ded774" -Method GET
```

**Expected Response:**
```json
{
  "status": "pending" | "transferred",
  "edition": 6,
  "claimDate": "...",
  "retryCount": 0
}
```

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 11: Responsive Design - Mobile**
**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone 12 Pro
4. Test all features

**Expected Results:**
- ✅ Layout adjusts to mobile
- ✅ Social icons still visible
- ✅ Buttons are tappable
- ✅ No horizontal scroll
- ✅ Images scale properly

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

### **TEST 12: Console Errors**
**Steps:**
1. Open browser console (F12)
2. Navigate through all pages
3. Perform all actions

**Expected Results:**
- ✅ No red errors
- ✅ No infinite loops
- ✅ No "Maximum update depth exceeded"
- ✅ No CORS errors
- ✅ No 404s for resources

**Actual Results:**
- [ ] PASS
- [ ] FAIL - Reason: _________________

---

## 🐛 **Known Issues to Fix**

### **CRITICAL**
1. [ ] Verification API not working - FIXED (changed .env to localhost)
2. [ ] Infinite loop in useEffect - FIXED (removed dependency)
3. [ ] ________________

### **HIGH PRIORITY**
1. [ ] ________________
2. [ ] ________________

### **MEDIUM PRIORITY**
1. [ ] ________________
2. [ ] ________________

### **LOW PRIORITY**
1. [ ] ________________
2. [ ] ________________

---

## 🔧 **Debugging Commands**

### **Check Backend Status:**
```powershell
Invoke-RestMethod -Uri http://localhost:5001/health -Method GET
```

### **Check Frontend Build:**
```powershell
cd crownmania_frontend
npm run build
```

### **View Backend Logs:**
```powershell
# Check terminal running: npm run dev (backend)
```

### **View Frontend Logs:**
```powershell
# Check browser console (F12)
```

### **Clear localStorage:**
```javascript
localStorage.clear();
location.reload();
```

### **Check Firestore Data:**
```javascript
// In browser console
JSON.parse(localStorage.getItem('crownmania_verified_serials'));
```

---

## ✅ **Test Completion Checklist**

- [ ] All 12 test cases executed
- [ ] All critical issues resolved
- [ ] All high priority issues resolved
- [ ] Social media icons working
- [ ] Verification flow working
- [ ] Visual effects working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Performance acceptable

---

## 📊 **Test Results Summary**

**Date:** __________  
**Tester:** __________  
**Total Tests:** 12  
**Passed:** ___  
**Failed:** ___  
**Pass Rate:** ___%  

**Overall Status:** ⚠️ IN PROGRESS

**Next Steps:**
1. ________________
2. ________________
3. ________________
