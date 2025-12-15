/**
 * Frontend Authentication Integration
 * 
 * This file contains ready-to-use code for your frontend to properly
 * authenticate with the backend using session cookies.
 */

// ===========================================================================
// API Configuration
// ===========================================================================

const API_BASE_URL = 'https://workerconnectbackend.onrender.com';

// ===========================================================================
// Method 1: Using Fetch (Vanilla JS or React)
// ===========================================================================

/**
 * Check if user is authenticated
 */
export async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
            method: 'GET',
            credentials: 'include', // ← CRITICAL: Send cookies!
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data; // { authenticated: true, user: {...} }
        }

        return { authenticated: false, user: null };
    } catch (error) {
        console.error('Auth check failed:', error);
        return { authenticated: false, user: null };
    }
}

/**
 * Make authenticated API request
 */
export async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // ← CRITICAL: Always include!
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
}

// ===========================================================================
// Method 2: Using Axios (If you prefer)
// ===========================================================================

import axios from 'axios';

// Create axios instance with credentials
export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // ← CRITICAL: Send cookies!
    headers: {
        'Content-Type': 'application/json'
    }
});

// Auth check with axios
export async function checkAuthAxios() {
    try {
        const response = await api.get('/api/auth/user');
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            return { authenticated: false, user: null };
        }
        throw error;
    }
}

// ===========================================================================
// Method 3: React Hook (Complete Auth Solution)
// ===========================================================================

import { useState, useEffect } from 'react';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const data = await checkAuth();
                setAuthenticated(data.authenticated);
                setUser(data.user);
            } catch (error) {
                console.error('Auth check error:', error);
                setAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuthentication();
    }, []);

    return { user, authenticated, loading };
}

// ===========================================================================
// Usage Examples
// ===========================================================================

/*
// Example 1: In a React component
function Dashboard() {
  const { user, authenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!authenticated) {
    // Redirect to SAML login
    window.location.href = 'https://workerconnectbackend.onrender.com/saml/login/worker';
    return null;
  }

  return <div>Welcome {user.name}!</div>;
}

// Example 2: Vanilla JavaScript
async function initApp() {
  const auth = await checkAuth();

  if (!auth.authenticated) {
    window.location.href = 'https://workerconnectbackend.onrender.com/saml/login/worker';
    return;
  }

  console.log('User:', auth.user);
  // Continue with your app
}

// Example 3: Making API calls
async function getTodayAttendance() {
  try {
    const data = await apiRequest('/api/attendance/today');
    return data;
  } catch (error) {
    console.error('Failed to get attendance:', error);
  }
}

// Example 4: SAML Login Buttons
function LoginButtons() {
  return (
    <div>
      <button onClick={() => window.location.href = 'https://workerconnectbackend.onrender.com/saml/login/worker'}>
        Login as Worker
      </button>
      <button onClick={() => window.location.href = 'https://workerconnectbackend.onrender.com/saml/login/establishment'}>
        Login as Establishment
      </button>
    </div>
  );
}
*/

// ===========================================================================
// IMPORTANT NOTES
// ===========================================================================

/*
1. ALWAYS use credentials: 'include' or withCredentials: true
   - This tells the browser to send cookies with cross-origin requests

2. Backend is configured for CORS with:
   - Access-Control-Allow-Origin: Your frontend domain
   - Access-Control-Allow-Credentials: true
   - Secure cookies with SameSite=None (for production)

3. After SAML login, you'll be redirected to your frontend with a session cookie
   - The cookie is named 'saml.sid'
   - It's HttpOnly and Secure (can't be accessed by JavaScript)
   - Browser automatically sends it when credentials: 'include' is used

4. If you get 401 errors:
   - Check browser console for CORS errors
   - Verify cookies in DevTools → Application → Cookies
   - Make sure 'saml.sid' cookie exists for workerconnectbackend.onrender.com
*/
