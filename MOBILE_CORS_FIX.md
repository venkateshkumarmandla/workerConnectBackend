# Mobile App CORS Fix - Complete Guide

## Problem

Mobile apps were experiencing CORS errors when making requests to `/api/auth/user` and other backend endpoints:

```
Access to fetch at 'https://workerconnectbackend.onrender.com/api/auth/user' 
from origin 'http://localhost' has been blocked by CORS policy: 
Request header field x-app-platform is not allowed by Access-Control-Allow-Headers
```

## Root Causes

1. **Custom headers not allowed**: Mobile app sends `X-App-Platform` and `X-Client-Type` headers that weren't in the allowed headers list
2. **Mobile origins not whitelisted**: Origins like `http://localhost`, `capacitor://localhost`, `file://` weren't allowed
3. **Missing OPTIONS handler**: Preflight requests (OPTIONS) weren't explicitly handled
4. **Cookie headers missing**: Mobile apps need `Cookie` and `Set-Cookie` in allowed/exposed headers

## Changes Made

### 1. Enhanced CORS Configuration (`src/server.js`)

#### Before:
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Limited origin list
    const allowedOrigins = [
      'https://dulcet-cobbler-4df9df.netlify.app',
      FRONTEND_URL,
      'http://localhost:5173',
    ];
    // ...
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};
```

#### After:
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps)
    if (!origin) {
      console.log('🔓 CORS: Allowing request with no origin (mobile app or tool)');
      return callback(null, true);
    }

    // Comprehensive allowed origins for mobile and web
    const allowedOrigins = [
      'https://dulcet-cobbler-4df9df.netlify.app',
      FRONTEND_URL,
      CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8100',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'file://',
    ].filter(Boolean);

    // Better logging for debugging
    if (isAllowed) {
      console.log(`✅ CORS: Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`⚠️  CORS: Origin not in whitelist but allowing: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-App-Platform',      // ✅ NEW: Mobile app detection
    'X-Client-Type',       // ✅ NEW: Client type detection
    'Cookie',              // ✅ NEW: Session cookies
    'Set-Cookie'           // ✅ NEW: Session cookies
  ],
  exposedHeaders: ['Set-Cookie'], // ✅ NEW: Allow reading Set-Cookie
  maxAge: 86400, // ✅ NEW: Cache preflight for 24 hours
};
```

### 2. Added Explicit OPTIONS Handler

```javascript
// Handle OPTIONS requests for CORS preflight
app.options('*', cors(corsOptions));
```

This ensures all preflight requests are properly handled before reaching route handlers.

## Mobile App Configuration

### React Native - Axios Setup

```javascript
// src/api/config.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://workerconnectbackend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Platform': 'mobile',
    'X-Client-Type': 'mobile-app',
  },
  withCredentials: true, // ✅ IMPORTANT: Enable cookies
});

export default api;
```

### React Native - Fetch Setup

```javascript
// src/api/auth.js
const fetchAuthUser = async () => {
  try {
    const response = await fetch(
      'https://workerconnectbackend.onrender.com/api/auth/user',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Platform': 'mobile',
          'X-Client-Type': 'mobile-app',
        },
        credentials: 'include', // ✅ IMPORTANT: Enable cookies
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Auth user fetch failed:', error);
    throw error;
  }
};
```

### Capacitor - Configuration

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workerconnect.app',
  appName: 'WorkerConnect',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // ✅ Use HTTPS scheme on Android
    cleartext: true,        // ✅ Allow HTTP in dev (disable in production)
    allowNavigation: [
      'https://workerconnectbackend.onrender.com',
      'https://dulcet-cobbler-4df9df.netlify.app',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // ✅ Use native HTTP for better CORS handling
    },
  },
};

export default config;
```

### Ionic - HTTP Configuration

```typescript
// src/app/services/http.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private baseUrl = 'https://workerconnectbackend.onrender.com';

  constructor(private http: HttpClient) {}

  getAuthUser() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-App-Platform': 'mobile',
      'X-Client-Type': 'mobile-app',
    });

    return this.http.get(`${this.baseUrl}/api/auth/user`, {
      headers,
      withCredentials: true, // ✅ Enable cookies
    });
  }
}
```

## Testing CORS

### Test from Mobile App

```javascript
// Test CORS from your mobile app
async function testCORS() {
  try {
    console.log('Testing CORS...');
    
    const response = await fetch(
      'https://workerconnectbackend.onrender.com/api/auth/user',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Platform': 'mobile',
          'X-Client-Type': 'mobile-app',
        },
        credentials: 'include',
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return data;
  } catch (error) {
    console.error('CORS test failed:', error);
    throw error;
  }
}

// Run the test
testCORS()
  .then(() => console.log('✅ CORS working!'))
  .catch(() => console.error('❌ CORS failed!'));
```

### Test with cURL

```bash
# Test OPTIONS preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-App-Platform, Content-Type" \
  -v \
  https://workerconnectbackend.onrender.com/api/auth/user

# Expected response:
# HTTP/1.1 204 No Content
# Access-Control-Allow-Origin: http://localhost
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Headers: Content-Type, X-App-Platform, ...
# Access-Control-Max-Age: 86400

# Test actual GET request
curl -X GET \
  -H "Origin: http://localhost" \
  -H "X-App-Platform: mobile" \
  -H "Content-Type: application/json" \
  -v \
  https://workerconnectbackend.onrender.com/api/auth/user
```

## Backend Logs

After the fix, you'll see helpful CORS logging:

```
🔓 CORS: Allowing request with no origin (mobile app or tool)
✅ CORS: Allowing origin: http://localhost
2025-12-15T07:40:19.000Z - GET /api/auth/user
🔍 [Auth Check] Headers: {
  origin: 'http://localhost',
  cookie: 'Present',
  credentials: undefined
}
```

## Common Issues & Solutions

### Issue 1: Still Getting CORS Error

**Problem**: Mobile app still shows CORS error after backend update

**Solution**:
1. **Clear app cache and rebuild**:
   ```bash
   # React Native
   cd android && ./gradlew clean
   cd ios && pod deintegrate && pod install
   
   # Capacitor
   npx cap sync
   ```

2. **Verify headers are being sent**:
   ```javascript
   // Add logging in your API client
   console.log('Request headers:', {
     'X-App-Platform': 'mobile',
     'X-Client-Type': 'mobile-app',
   });
   ```

3. **Check backend is deployed**:
   - Ensure latest code is deployed to Render
   - Check Render logs for CORS messages

### Issue 2: Cookies Not Working

**Problem**: Session cookies not being sent/received

**Solution**:
1. **Ensure `credentials: 'include'` or `withCredentials: true`**
2. **Check cookie settings in browser/app**:
   ```javascript
   // React Native - Allow cookies
   import CookieManager from '@react-native-cookies/cookies';
   
   CookieManager.setFromResponse(
     'https://workerconnectbackend.onrender.com',
     response.headers['set-cookie']
   );
   ```

3. **For Capacitor, use HTTP plugin**:
   ```typescript
   import { CapacitorHttp } from '@capacitor/core';
   
   const response = await CapacitorHttp.get({
     url: 'https://workerconnectbackend.onrender.com/api/auth/user',
     headers: {
       'X-App-Platform': 'mobile',
     },
     webFetchExtra: {
       credentials: 'include',
     },
   });
   ```

### Issue 3: Different Behavior on iOS vs Android

**Problem**: CORS works on Android but not iOS (or vice versa)

**Solution**:
1. **iOS requires HTTPS for cookies**: Use `https://` for `baseURL`
2. **Android cleartext traffic**: Add to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <application
     android:usesCleartextTraffic="true"
     ...
   ```
3. **iOS App Transport Security**: Add to `ios/App/Info.plist`:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
     <key>NSAllowsArbitraryLoads</key>
     <true/>
   </dict>
   ```

### Issue 4: Preflight Request Failing

**Problem**: OPTIONS request returns 404 or 401

**Solution**:
- Backend now has explicit `app.options('*', cors(corsOptions))` handler
- Ensure this is placed **before** authentication middleware
- Check that route-specific OPTIONS handlers don't override global handler

## Verification Checklist

- [ ] Backend deployed with updated CORS configuration
- [ ] Mobile app sends `X-App-Platform: mobile` header
- [ ] Mobile app sets `credentials: 'include'` or `withCredentials: true`
- [ ] OPTIONS preflight request returns 204 with correct headers
- [ ] GET request to `/api/auth/user` succeeds
- [ ] Session cookies are sent and received
- [ ] Backend logs show CORS messages

## Summary

✅ **Added mobile app origins**: `http://localhost`, `capacitor://localhost`, `file://`  
✅ **Allowed custom headers**: `X-App-Platform`, `X-Client-Type`  
✅ **Enabled cookie support**: Added `Cookie` and `Set-Cookie` to allowed/exposed headers  
✅ **Added OPTIONS handler**: Explicit preflight request handling  
✅ **Better logging**: CORS decisions are now logged for debugging  
✅ **Cached preflight**: 24-hour cache to reduce preflight requests

## Next Steps

1. Deploy backend to Render with updated CORS configuration
2. Update mobile app to send custom headers
3. Test CORS with mobile app on both iOS and Android
4. Monitor backend logs for CORS issues
5. Verify session cookies work correctly

## Support

If you still experience CORS issues:
1. Check backend logs for CORS messages
2. Verify headers are being sent from mobile app
3. Test with cURL to isolate the issue
4. Check browser DevTools Network tab for preflight requests
