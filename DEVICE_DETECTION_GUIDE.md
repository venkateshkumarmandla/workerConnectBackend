# Device Detection for SAML Authentication

## Overview

The backend now intelligently detects whether a SAML authentication request is coming from a **mobile app** or a **web browser** and redirects accordingly after successful authentication.

## How It Works

### Detection Methods (in order of priority)

1. **Custom Headers** (Most Reliable)
   - `X-App-Platform: mobile`
   - `X-Client-Type: mobile-app`

2. **Origin Header**
   - `http://localhost` (React Native dev)
   - `capacitor://localhost` (Capacitor iOS)
   - `ionic://localhost` (Ionic)
   - `http://localhost:8080` (Capacitor Android)
   - `file://` (Cordova)

3. **User-Agent String**
   - Contains: `WorkerConnect`, `ReactNative`, `Capacitor`, `Cordova`, `Ionic`

4. **Query Parameters** (for testing)
   - `?platform=mobile`
   - `?app=true`

5. **Session Flag**
   - Set during initial login and persists across requests

### Redirect Behavior

| Device Type | Environment Variable | Default URL |
|------------|---------------------|-------------|
| **Mobile App** | `MOBILE_APP_URL` | `http://localhost` |
| **Web Browser** | `CLIENT_URL` | `http://localhost:5173` |

## Environment Variables

Add these to your `.env` file:

```bash
# Web browser frontend (Netlify)
CLIENT_URL=https://dulcet-cobbler-4df9df.netlify.app

# Mobile app deep link or custom scheme
MOBILE_APP_URL=workerconnect://
# OR for development:
# MOBILE_APP_URL=http://localhost
```

## Mobile App Setup

### Option 1: Custom Headers (Recommended)

Add custom headers to all HTTP requests from your mobile app:

#### React Native (Axios)

```javascript
// src/api/config.js
import axios from 'axios';
import { Platform } from 'react-native';

const api = axios.create({
  baseURL: 'https://workerconnectbackend.onrender.com',
  headers: {
    'X-App-Platform': 'mobile',
    'X-Client-Type': 'mobile-app',
  },
  withCredentials: true,
});

export default api;
```

#### React Native (Fetch)

```javascript
// src/api/saml.js
export const initiateLogin = async (role) => {
  const response = await fetch(
    `https://workerconnectbackend.onrender.com/saml/login/${role}`,
    {
      headers: {
        'X-App-Platform': 'mobile',
        'X-Client-Type': 'mobile-app',
      },
      credentials: 'include',
    }
  );
  return response;
};
```

### Option 2: Custom User-Agent

Modify the User-Agent to include your app identifier:

#### React Native

```javascript
// In your main App.js or index.js
import { Platform } from 'react-native';

// For Axios
axios.defaults.headers.common['User-Agent'] = 
  `WorkerConnect/${Platform.OS}/${Platform.Version}`;

// For Fetch (in WebView)
const customUserAgent = `WorkerConnect/${Platform.OS}/${Platform.Version}`;
```

#### Capacitor

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workerconnect.app',
  appName: 'WorkerConnect',
  webDir: 'dist',
  server: {
    // This will be added to User-Agent automatically
    androidScheme: 'https'
  },
  plugins: {
    // Custom User-Agent via plugin
  }
};

export default config;
```

### Option 3: Deep Linking / Custom URL Scheme

Set up deep linking to handle redirects from the backend:

#### React Native

1. **Configure URL Scheme** (`ios/WorkerConnect/AppDelegate.m` and `android/app/src/main/AndroidManifest.xml`):

```xml
<!-- Android: AndroidManifest.xml -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="workerconnect" />
</intent-filter>
```

2. **Handle Deep Links**:

```javascript
// App.js
import { Linking } from 'react-native';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = (url) => {
    // Parse URL: workerconnect://dashboard/worker
    const route = url.replace('workerconnect://', '');
    
    // Navigate to route
    navigation.navigate(route);
  };

  return <NavigationContainer>{/* ... */}</NavigationContainer>;
}
```

3. **Update Environment Variable**:

```bash
MOBILE_APP_URL=workerconnect://
```

## SAML Flow for Mobile App

### Standard Flow

```
1. User opens mobile app
2. App initiates login: 
   → POST /saml/login/worker (with X-App-Platform: mobile header)
3. Backend redirects to SafeNet Trusted Access
4. User authenticates with STA
5. STA sends SAML response to backend → POST /saml/acs
6. Backend detects mobile app request
7. Backend redirects to: workerconnect://dashboard/worker
8. Mobile app intercepts deep link and navigates to dashboard
```

### In-App Browser Flow

For better UX, use an in-app browser (WebView) for SAML authentication:

```javascript
// src/screens/LoginScreen.js
import { WebView } from 'react-native-webview';

function LoginScreen() {
  const handleNavigationStateChange = (navState) => {
    // Detect redirect to workerconnect://
    if (navState.url.startsWith('workerconnect://')) {
      // Close WebView and handle deep link
      const route = navState.url.replace('workerconnect://', '');
      navigation.navigate(route);
    }
  };

  return (
    <WebView
      source={{ 
        uri: 'https://workerconnectbackend.onrender.com/saml/login/worker',
        headers: {
          'X-App-Platform': 'mobile',
          'X-Client-Type': 'mobile-app',
        }
      }}
      sharedCookiesEnabled={true}
      onNavigationStateChange={handleNavigationStateChange}
    />
  );
}
```

## Testing

### Test Device Detection

1. **From Web Browser**:
   ```bash
   curl -v https://workerconnectbackend.onrender.com/saml/login/worker
   # Should redirect to: https://dulcet-cobbler-4df9df.netlify.app/dashboard/worker
   ```

2. **From Mobile App** (with custom header):
   ```bash
   curl -v -H "X-App-Platform: mobile" \
     https://workerconnectbackend.onrender.com/saml/login/worker
   # Should redirect to: workerconnect://dashboard/worker
   # or http://localhost/dashboard/worker
   ```

3. **Using Query Parameter** (for testing):
   ```
   https://workerconnectbackend.onrender.com/saml/login/worker?platform=mobile
   # Forces mobile detection
   ```

### Check Device Detection in Backend Logs

After SAML authentication, you'll see:

```
✅ SAML authentication successful
👤 User: { nameID: '...', employeeNumber: '...' }
📱 Device Info: {
  isMobileApp: true,
  isMobileBrowser: false,
  isDesktopBrowser: false,
  userAgent: 'WorkerConnect/iOS/15.0',
  origin: 'http://localhost',
  customHeaders: { 'x-app-platform': 'mobile' }
}
🚀 Redirecting mobile app to: workerconnect://dashboard/worker
```

## Troubleshooting

### Mobile app not being detected

**Solution 1**: Ensure custom headers are sent
```javascript
// Verify headers in your API client
console.log('Request headers:', {
  'X-App-Platform': 'mobile',
  'X-Client-Type': 'mobile-app',
});
```

**Solution 2**: Use query parameter override for testing
```javascript
const loginUrl = `${API_URL}/saml/login/worker?platform=mobile`;
```

### Redirect URL not working in mobile app

**Solution 1**: Verify deep linking is configured correctly
```bash
# Test deep linking
adb shell am start -W -a android.intent.action.VIEW \
  -d "workerconnect://dashboard/worker" com.workerconnect.app
```

**Solution 2**: Check environment variable is set
```bash
# In .env
MOBILE_APP_URL=workerconnect://
```

### Session not persisting after SAML redirect

**Solution**: Ensure cookies are enabled in WebView
```javascript
// React Native WebView
<WebView
  sharedCookiesEnabled={true}
  thirdPartyCookiesEnabled={true}
  // ...
/>
```

## API Reference

### Device Detection Functions

```javascript
import { 
  isMobileApp, 
  isMobileBrowser, 
  isDesktopBrowser,
  getDeviceInfo,
  getRedirectUrl 
} from '../utils/deviceDetection.js';

// Check if request is from mobile app
if (isMobileApp(req)) {
  // Handle mobile app request
}

// Get full device information
const info = getDeviceInfo(req);
console.log(info);
// {
//   isMobileApp: boolean,
//   isMobileBrowser: boolean,
//   isDesktopBrowser: boolean,
//   userAgent: string,
//   origin: string,
//   customHeaders: object
// }

// Get appropriate redirect URL based on device
const url = getRedirectUrl(req, '/dashboard/worker');
res.redirect(url);
```

## Summary

✅ Backend automatically detects mobile app vs web browser  
✅ Redirects to appropriate URL after SAML authentication  
✅ Multiple detection methods for reliability  
✅ Easy to test with query parameters  
✅ Works with React Native, Capacitor, Cordova, Ionic  
✅ Configurable via environment variables
