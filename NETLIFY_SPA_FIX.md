# Netlify 404 Fix (SPA Redirect Rule)

## Problem
You are seeing a **404 Page Not Found** error when the backend redirects you to `/dashboard/worker`.

## Cause
Your React application is a **Single Page Application (SPA)**. 
When accessing deep links like `/dashboard/worker` directly (via redirect), Notlify tries to find a real file at that path. Since it doesn't exist (it's handled by React Router), Netlify returns 404.

## Solution
You need to tell Netlify to send ALL traffic to `index.html` so React Router can handle it.

### Step 1: Create `_redirects` file

Create a new file named `_redirects` (no extension) in your frontend's **public** folder (usually `public/` or `static/`).

**File Path**: `frontend/public/_redirects`

**Content**:
```
/*  /index.html  200
```

### Step 2: Re-deploy Frontend
Commit this file to your frontend repository and push. Netlify will detect it automatically.

### Verification
Once deployed:
1. Try accessing `https://dulcet-cobbler.../dashboard/worker` directly in your browser.
2. It should load the React app (even if you get redirected to login, the 404 should be gone).

### Alternative (netlify.toml)
If you already have a `netlify.toml` file in your root, add this:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
