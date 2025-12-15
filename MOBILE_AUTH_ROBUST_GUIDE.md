# Mobile Auth Setup - Robust Strategy

## Overview

We have implemented a **Robust Hybrid Authentication** strategy for mobile apps to bypass Android WebView cookie blocking issues.

## How it works

1. **Primary**: Cookies (Standard session cookie)
2. **Fallback**: Header-Based Auth (`X-Session-Token`)

If the mobile app cannot store/send cookies (common on Android), it can use the session token from the redirect URL.

## Backend Changes Implemented

1. **`server.js`**: Added middleware to check for `X-Session-Token` header and inject it as a cookie.
2. **`saml.js`**: SAML redirect now appends `?session_token=s:xxx...` to the mobile deep link.
3. **CORS**: Added `X-Session-Token` to allowed headers.

## Mobile App Integration

### Step 1: Handle Deep Link

Update your mobile app deep link handler to extract the `session_token`:

```javascript
// React Native Example
Linking.addEventListener('url', ({ url }) => {
  // url = workerconnect://dashboard/worker?session_token=s%3Axyz...
  
  const params = new URLSearchParams(url.split('?')[1]);
  const sessionToken = params.get('session_token');
  
  if (sessionToken) {
    // Save token to secure storage
    await SecureStore.setItemAsync('session_token', sessionToken);
    
    // Set global API header
    api.defaults.headers.common['X-Session-Token'] = sessionToken;
  }
  
  // Navigate to dashboard...
});
```

### Step 2: Configure API Client

Ensure your API client sends the header:

```javascript
// axios config
const token = await SecureStore.getItemAsync('session_token');

const api = axios.create({
  baseURL: 'https://workerconnectbackend.onrender.com',
  headers: {
    'X-App-Platform': 'mobile',
    'X-Client-Type': 'mobile-app',
    ...(token ? { 'X-Session-Token': token } : {}) // Send if available
  },
  withCredentials: true // Still try to use cookies!
});
```

## Setup Checklist

- [ ] **Deploy Backend**: Push changes to Render (`npm install cookie-signature` is required)
- [ ] **Update Mobile App**: Add logic to save token from URL and send in header
- [ ] **Test**: 
  - Login via SAML
  - Check if `session_token` is in redirect URL
  - Verify subsequent API calls succeed

## Troubleshooting

- **CORS Errors**: Check if `X-Session-Token` is being sent but rejected (should be allowed now)
- **401 Unauthorized**: Check if token is being sent in header. Check backend logs for `[Mobile Session] Injected cookie...`

## Note on Web Version

The web version continues to use standard **Secure Cookies**. This fallback is strictly for mobile apps detected via User-Agent/Headers.
