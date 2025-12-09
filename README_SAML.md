# SAML Authentication Implementation Summary

## Overview

This Express.js backend now includes complete SAML 2.0 authentication with SafeNet Trusted Access (STA) as the Identity Provider, including card reader integration for physical access control.

## What Was Implemented

### 1. Core SAML Configuration (`src/config/saml.js`)
- Complete SAML Service Provider configuration
- SafeNet Trusted Access integration settings
- Certificate management (file-based or environment variable)
- Attribute mapping configuration
- Configuration validation

### 2. SAML Routes (`src/routes/saml.js`)
- **GET `/saml/login`** - Initiates SAML authentication flow
- **POST `/saml/acs`** - Assertion Consumer Service (SAML callback)
- **POST `/saml/logout`** - SAML logout handler
- **GET `/metadata`** - Service Provider metadata XML
- **POST `/card-scan`** - Card reader scan endpoint
- **GET `/saml/status`** - Authentication status check
- **GET `/saml/config`** - Configuration status (development only)

### 3. SAML Middleware (`src/middleware/samlAuth.js`)
- `requireSamlAuth` - Protect routes requiring SAML authentication
- `checkCardScanPending` - Check for pending card scans
- Session management utilities

### 4. Server Integration (`src/server.js`)
- Express session configuration
- Passport initialization
- SAML routes integration
- Enhanced logging and status reporting

### 5. Documentation
- **SAML_SETUP.md** - Complete setup guide
- **SAML_QUICK_START.md** - Quick reference guide
- **RENDER_DEPLOYMENT.md** - Render-specific deployment guide
- **env.example.txt** - Updated with SAML configuration variables

### 6. Utilities
- Certificate generation script (`scripts/generate-saml-certs.sh`)

## Key Features

### Card Reader Integration
1. **Card Scan Endpoint** (`POST /card-scan`)
   - Receives `cardId` from card reader
   - Stores `cardId` in session as `pendingCardId`
   - If user is logged in → logs out first
   - Redirects to `/saml/login`

2. **Card Validation**
   - After SAML authentication, validates that STA user's `employeeNumber` or `nameID` matches scanned `cardId`
   - If mismatch → access denied
   - If match → session created, redirect to dashboard

### Authentication Flow

```
Card Scan → /card-scan → Store cardId → /saml/login → 
STA Login → /saml/acs → Validate cardId → Session → /dashboard
```

### Logout Flow

```
New Card Scan (while logged in) → Logout current user → 
Store new cardId → /saml/login → New authentication
```

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── saml.js              # SAML configuration
│   ├── middleware/
│   │   └── samlAuth.js          # SAML authentication middleware
│   ├── routes/
│   │   └── saml.js              # SAML routes
│   └── server.js                 # Updated with SAML integration
├── scripts/
│   └── generate-saml-certs.sh   # Certificate generation script
├── certs/                        # Certificate storage (optional)
├── SAML_SETUP.md                 # Complete setup guide
├── SAML_QUICK_START.md           # Quick reference
├── env.example.txt               # Updated with SAML vars
└── package.json                  # Updated dependencies
```

## Dependencies Added

- `passport` - Authentication middleware
- `passport-saml` - SAML strategy for Passport
- `express-session` - Session management

## Configuration Required

### Environment Variables

**Required (for Render deployment at https://workerconnectbackend.onrender.com):**
- `SESSION_SECRET` - Session encryption secret
- `SAML_ENTITY_ID` - Service Provider Entity ID: `https://workerconnectbackend.onrender.com/saml/metadata`
- `SAML_ACS_URL` - Assertion Consumer Service URL: `https://workerconnectbackend.onrender.com/saml/acs`
- `SAML_LOGOUT_URL` - Single Logout Service URL: `https://workerconnectbackend.onrender.com/saml/logout`
- `SAML_ENTRY_POINT` - SafeNet Trusted Access SSO URL
- `SAML_ISSUER` - STA Entity ID
- `SAML_IDP_CERT` - STA public certificate

**Optional:**
- `SAML_SP_CERT` - Service Provider certificate
- `SAML_SP_PRIVATE_KEY` - Service Provider private key
- `SAML_NAME_ID_FORMAT` - NameID format

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Certificates** (Optional)
   ```bash
   ./scripts/generate-saml-certs.sh
   ```

3. **Configure Environment**
   - Copy `env.example.txt` to `.env`
   - Fill in SAML configuration values

4. **Get SP Metadata**
   - **For Render**: Visit `https://workerconnectbackend.onrender.com/metadata`
   - **For local**: Start server: `npm start`, then visit `http://localhost:3001/metadata`
   - Save XML to `sp-metadata.xml`

5. **Configure SafeNet Trusted Access**
   - Upload `sp-metadata.xml` to STA
   - Configure attribute mapping (employeeNumber → Card ID)
   - Download STA metadata and extract configuration

6. **Test**
   - **For Render**: 
     - Test login: `curl https://workerconnectbackend.onrender.com/saml/login`
     - Test card scan: `curl -X POST https://workerconnectbackend.onrender.com/card-scan -d '{"cardId":"12345"}'`
     - Check status: `curl https://workerconnectbackend.onrender.com/saml/status`
   - **For local**:
     - Test login: `curl http://localhost:3001/saml/login`
     - Test card scan: `curl -X POST http://localhost:3001/card-scan -d '{"cardId":"12345"}'`
     - Check status: `curl http://localhost:3001/saml/status`

## Documentation

- **Complete Setup Guide**: See [SAML_SETUP.md](./SAML_SETUP.md)
- **Quick Reference**: See [SAML_QUICK_START.md](./SAML_QUICK_START.md)
- **Render Deployment**: See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

## Security Notes

1. **Never commit** `.env` file or private keys to version control
2. **Use HTTPS** in production
3. **Strong session secret** required
4. **Validate certificates** properly
5. **Card ID validation** is critical for security

## Support

For detailed configuration instructions, troubleshooting, and advanced setup, refer to:
- [SAML_SETUP.md](./SAML_SETUP.md) - Complete documentation
- [SAML_QUICK_START.md](./SAML_QUICK_START.md) - Quick reference



