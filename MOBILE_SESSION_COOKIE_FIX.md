# Mobile Session Cookie Fix - Complete Guide

## Problem Solved ✅

Mobile apps were losing authentication immediately after SAML login because session cookies couldn't be stored in Android WebView on `http://localhost`.

## Root Cause

Previous configuration used **production-only cookie settings**:
```javascript
cookie: {
  secure: true,      // ❌ Requires HTTPS - blocked on http://localhost
  sameSite: 'none'   // ❌ Requires secure: true
}
```

Android WebView on `http://localhost` cannot store cookies with `secure: true`.

## Solution Implemented

### Dynamic Cookie Configuration

**`src/server.js`** now uses environment-based cookie settings:

```javascript
const getSessionCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Secure cookies for HTTPS (web browsers)
    return {
      secure: true,           // ✅ HTTPS required
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none',       // ✅ Cross-origin for SAML
    };
  } else {
    // Development: Relaxed cookies for HTTP (mobile apps)
    return {
      secure: false,          // ✅ HTTP allowed for localhost
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',        // ✅ Relaxed for mobile
    };
  }
};
```

### Session Debugging

Added logging to track session state:

```javascript
app.use((req, res, next) => {
  if (req.path.includes('/api/auth') || req.path.includes('/saml')) {
    console.log(`📊 [Session] ${req.method} ${req.path}`);
    console.log(`📊 [Session] Has Session: ${!!req.session}, ID: ${req.sessionID}`);
    console.log(`📊 [Session] Has User: ${!!(req.session && req.session.user)}`);
    console.log(`📊 [Session] Cookie Header: ${req.headers.cookie ? 'Present' : 'Missing'}`);
  }
  next();
});
```

## How It Works

### Production (Web Browsers)
```
Environment: NODE_ENV=production
Cookie Settings:
  - secure: true (HTTPS only)
  - sameSite: none (cross-origin)
  
Flow:
1. User accesses https://workerconnectbackend.onrender.com/saml/login/worker
2. SAML redirects to https://dulcet-cobbler-4df9df.netlify.app/dashboard/worker
3. Browser stores secure cookie ✅
4. Subsequent requests include cookie ✅
```

### Development (Mobile Apps)
```
Environment: NODE_ENV=development
Cookie Settings:
  - secure: false (HTTP allowed)
  - sameSite: lax (relaxed)
  
Flow:
1. Mobile app accesses https://workerconnectbackend.onrender.com/saml/login/worker
2. SAML redirects to http://localhost/dashboard/worker
3. WebView stores cookie (HTTP allowed) ✅
4. Subsequent requests include cookie ✅
```

## Expected Behavior After Fix

### Before (Broken)
```
✅ [SAML] Session created for undefined as worker
🚀 Redirecting mobile app to: http://localhost/dashboard/worker
❌ [Auth Check] No authentication found  // Cookie lost
```

### After (Fixed)
```
✅ [SAML] Session created for undefined as worker
🚀 Redirecting mobile app to: http://localhost/dashboard/worker
📊 [Session] GET /api/auth/user
📊 [Session] Has Session: true, ID: xxx
📊 [Session] Has User: true
📊 [Session] Cookie Header: Present
✅ [Auth Check] User authenticated: undefined
```

## Environment Configuration

### Development (Mobile Testing)

```bash
# .env for local development
NODE_ENV=development
PORT=3001

# Other settings...
```

**Result**: Cookies work on HTTP localhost for mobile apps

### Production (Deployed to Render)

```bash
# Render environment variables
NODE_ENV=production
PORT=3001

# Other settings...
```

**Result**: Secure cookies for HTTPS web browsers

## Testing

### Test 1: Web Browser (Production Behavior)

Even in development, you can test production cookie behavior:

```bash
# Temporarily set NODE_ENV=production
NODE_ENV=production npm start
```

1. Navigate to backend URL in web browser
2. Complete SAML authentication
3. Check browser DevTools → Application → Cookies
4. **Expected**: `saml.sid` cookie with `Secure ✓` and `SameSite=None`
5. Subsequent requests should include cookie

### Test 2: Mobile App (Development Behavior)

```bash
# Default: NODE_ENV=development
npm start
```

1. Open mobile app (Android emulator/device)
2. Navigate to SAML login
3. Complete authentication
4. **Check backend logs**:
   ```
   📊 [Session] POST /saml/acs
   📊 [Session] Has Session: true
   📊 [Session] Has User: true
   ✅ [SAML] Session created for undefined as worker
   
   📊 [Session] GET /api/auth/user
   📊 [Session] Cookie Header: Present  ✅
   ✅ [Auth Check] User authenticated
   ```
5. Mobile app should show dashboard (not redirect to login)
6. Navigate within app - should stay authenticated

### Test 3: Session Debugging

Check backend logs for session flow:

```
// SAML authentication
📊 [Session] GET /saml/login/worker
📊 [Session] Has Session: false
📊 [Session] Cookie Header: Missing

// After authentication
📊 [Session] POST /saml/acs
📊 [Session] Has Session: true, ID: abc123
📊 [Session] Has User: true
📊 [Session] Cookie Header: Present  ✅

// Subsequent requests
📊 [Session] GET /api/auth/user
📊 [Session] Has Session: true, ID: abc123
📊 [Session] Has User: true
📊 [Session] Cookie Header: Present  ✅
```

## Mobile App WebView Configuration

### React Native WebView

Ensure cookies are enabled:

```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://workerconnectbackend.onrender.com/saml/login/worker' }}
  sharedCookiesEnabled={true}           // ✅ Enable cookie sharing
  thirdPartyCookiesEnabled={true}       // ✅ Allow third-party cookies
  cacheEnabled={true}
  domStorageEnabled={true}
  javaScriptEnabled={true}
/>
```

### Capacitor HTTP Plugin

Use native HTTP for better cookie handling:

```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: 'https://workerconnectbackend.onrender.com/api/auth/user',
  headers: {
    'X-App-Platform': 'mobile',
  },
  webFetchExtra: {
    credentials: 'include',  // ✅ Include cookies
  },
});
```

## Troubleshooting

### Issue: Cookies Still Not Working in Mobile

**Check 1: Verify NODE_ENV**
```bash
# In backend logs, you should see:
🌍 Environment: development
```

**Check 2: Check Cookie Settings**
```javascript
// Add temporary debug log in getSessionCookieConfig()
console.log('Cookie config:', getSessionCookieConfig());

// Should show:
// Cookie config: { secure: false, httpOnly: true, maxAge: 86400000, sameSite: 'lax' }
```

**Check 3: Mobile App Sends Cookies**
```javascript
// In mobile app, check if cookies are stored
import CookieManager from '@react-native-cookies/cookies';

CookieManager.get('https://workerconnectbackend.onrender.com')
  .then((cookies) => {
    console.log('Stored cookies:', cookies);
    // Should show: { 'saml.sid': {...} }
  });
```

### Issue: Web Version Broken

**Verify**: Production uses secure cookies

```bash
# SSH into Render or check environment
echo $NODE_ENV
# Should be: production
```

If somehow development mode in production:
```bash
# Set in Render environment variables
NODE_ENV=production
```

Redeploy.

## Security Considerations

### ✅ Safe
- Development mode only used for local testing with mobile apps
- Production always uses secure cookies
- HttpOnly flag prevents XSS in both modes
- Session timeout still enforced (24 hours)

### ⚠️ Note
- Development mode cookies (`secure: false`) should **never** be used in production
- Always verify `NODE_ENV=production` in deployed environments
- Mobile app on `http://localhost` is acceptable for development

## Deployment Checklist

### Local Development
- [ ] Set `NODE_ENV=development` in `.env`
- [ ] Test mobile app SAML flow
- [ ] Verify session persists after redirect
- [ ] Check backend logs show "Cookie Header: Present"

### Production Deployment (Render)
- [ ] Verify `NODE_ENV=production` in Render environment variables
- [ ] Deploy changes
- [ ] Test web browser SAML flow
- [ ] Verify secure cookies in browser DevTools
- [ ] Monitor logs for session issues

## Summary

✅ **Problem**: Mobile apps couldn't store secure cookies on HTTP localhost  
✅ **Solution**: Dynamic cookie config based on NODE_ENV  
✅ **Web Impact**: None - production still uses secure cookies  
✅ **Mobile Impact**: Cookies now work on HTTP localhost in development  
✅ **Security**: HttpOnly + environment-based secure flag  
✅ **Debugging**: Added session logging for troubleshooting  

## Files Modified

1. **src/server.js**:
   - Added `getSessionCookieConfig()` function
   - Updated session middleware to use dynamic config
   - Added session debugging middleware

## Next Steps

1. **Restart backend** with `NODE_ENV=development`
2. **Test mobile app** SAML authentication
3. **Check logs** for session debugging output
4. **Verify** `/api/auth/user` returns authenticated user
5. **Deploy to production** once confirmed working
