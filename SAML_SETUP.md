# SAML Authentication Setup Guide

This guide explains how to configure SAML authentication with SafeNet Trusted Access (STA) as the Identity Provider for the WorkerConnect backend.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Certificate Generation](#certificate-generation)
5. [SafeNet Trusted Access Configuration](#safenet-trusted-access-configuration)
6. [Backend Configuration](#backend-configuration)
7. [Testing](#testing)
8. [Card Reader Integration](#card-reader-integration)
9. [Troubleshooting](#troubleshooting)

## Overview

The SAML authentication flow works as follows:

1. **Card Scan** → User scans a card, `cardId` is sent to `/card-scan`
2. **SAML Login** → Backend redirects to SafeNet Trusted Access login page
3. **STA Authentication** → User authenticates with STA
4. **SAML Response** → STA sends SAML response to `/saml/acs`
5. **Card Validation** → Backend validates that STA user matches scanned `cardId`
6. **Session Creation** → User session is created and redirected to `/dashboard`

## Prerequisites

- Node.js 18+ installed
- SafeNet Trusted Access tenant access
- OpenSSL installed (for certificate generation)
- Basic understanding of SAML 2.0

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `passport` - Authentication middleware
- `passport-saml` - SAML strategy for Passport
- `express-session` - Session management

### 2. Generate Service Provider Certificates

Generate certificates for signing SAML requests (optional but recommended):

```bash
# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/sp-private-key.pem 2048

# Generate certificate (valid for 365 days)
openssl req -new -x509 -key certs/sp-private-key.pem -out certs/sp-certificate.pem -days 365

# When prompted, enter your organization details:
# Country Name: US
# State: Your State
# Locality: Your City
# Organization: Your Organization
# Organizational Unit: IT
# Common Name: yourdomain.com (or localhost for testing)
# Email: your-email@example.com
```

**Note:** For production, use a proper certificate from a Certificate Authority (CA).

### 3. Configure Environment Variables

Copy `env.example.txt` to `.env` and configure SAML settings:

```bash
cp env.example.txt .env
```

Edit `.env` and set the following variables:

```env
# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here

# Service Provider Configuration
SAML_ENTITY_ID=https://yourdomain.com/saml/metadata
SAML_ACS_URL=http://localhost:3001/saml/acs
SAML_LOGOUT_URL=http://localhost:3001/saml/logout

# SafeNet Trusted Access Configuration
SAML_ENTRY_POINT=https://your-tenant.safenetidp.com/saml/sso
SAML_ISSUER=https://your-tenant.safenetidp.com
SAML_IDP_CERT=-----BEGIN CERTIFICATE-----
[Paste STA certificate here]
-----END CERTIFICATE-----

# Service Provider Certificates (if using files, leave these empty)
# Or paste the certificate/key content directly
SAML_SP_CERT=
SAML_SP_PRIVATE_KEY=
```

## Certificate Generation

### Option 1: Using Certificate Files (Recommended for Development)

Place your certificates in the `certs/` directory:
- `certs/sp-private-key.pem` - Service Provider private key
- `certs/sp-certificate.pem` - Service Provider certificate

The application will automatically load them if they exist.

### Option 2: Using Environment Variables (Recommended for Production)

Paste the full certificate and private key content directly in `.env`:

```env
SAML_SP_CERT=-----BEGIN CERTIFICATE-----
MIIF... (full certificate)
-----END CERTIFICATE-----

SAML_SP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIE... (full private key)
-----END PRIVATE KEY-----
```

**Security Note:** Never commit `.env` file or private keys to version control!

## SafeNet Trusted Access Configuration

### Step 1: Get Service Provider Metadata

**For Render deployment:**
1. Access the metadata endpoint:
   ```
   https://workerconnectbackend.onrender.com/metadata
   ```

2. Save the XML metadata to a file (e.g., `sp-metadata.xml`)

**For local development:**
1. Start your Express server:
   ```bash
   npm start
   ```

2. Access the metadata endpoint:
   ```
   http://localhost:3001/metadata
   ```

3. Save the XML metadata to a file (e.g., `sp-metadata.xml`)

### Step 2: Configure Application in STA

1. Log in to SafeNet Trusted Access Admin Console
2. Navigate to **Applications** → **Add Application**
3. Select **SAML 2.0** as the application type
4. Choose **Upload Metadata** and upload your `sp-metadata.xml` file

### Step 3: Configure Application Settings in STA

Configure the following settings in STA:

#### Basic Settings

- **Application Name**: WorkerConnect Backend
- **Description**: SAML authentication for WorkerConnect

#### SAML Settings

- **Entity ID**: `https://workerconnectbackend.onrender.com/saml/metadata`
  - Must match `SAML_ENTITY_ID` in your `.env`

- **Assertion Consumer Service (ACS) URL**: `https://workerconnectbackend.onrender.com/saml/acs`
  - Must match `SAML_ACS_URL` in your `.env`

- **Single Logout Service (SLO) URL**: `https://workerconnectbackend.onrender.com/saml/logout`
  - Must match `SAML_LOGOUT_URL` in your `.env`

- **NameID Format**: `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`
  - Must match `SAML_NAME_ID_FORMAT` in your `.env`

#### Attribute Mapping

Configure attribute mapping in STA to send the following attributes:

1. **NameID** (Primary Identifier)
   - Format: Persistent or Unspecified
   - Value: Employee Number or Card ID

2. **employeeNumber** (Custom Attribute)
   - Attribute Name: `employeeNumber`
   - Value: Employee Number / Card ID
   - This should match the `cardId` scanned by the card reader

3. **Email** (Optional)
   - Attribute Name: `email` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - Value: User's email address

4. **First Name** (Optional)
   - Attribute Name: `firstName` or `givenName`

5. **Last Name** (Optional)
   - Attribute Name: `lastName` or `surname`

### Step 4: Download STA Metadata

1. In STA console, navigate to your application
2. Download the **IDP Metadata** or **SAML Metadata**
3. Extract the following information:
   - **Entity ID / Issuer**: Copy to `SAML_ISSUER`
   - **SSO URL / Entry Point**: Copy to `SAML_ENTRY_POINT`
   - **Certificate**: Copy to `SAML_IDP_CERT`

### Step 5: Configure User Assignment

Assign users or groups to the application in STA. Ensure that:
- Users have an `employeeNumber` attribute that matches their card ID
- The NameID format is configured correctly

## Backend Configuration

### Environment Variables Reference

| Variable | Description | Example (Render) |
|----------|-------------|------------------|
| `SESSION_SECRET` | Secret for session encryption | `your-random-secret` |
| `SAML_ENTITY_ID` | SP Entity ID | `https://workerconnectbackend.onrender.com/saml/metadata` |
| `SAML_ACS_URL` | ACS callback URL | `https://workerconnectbackend.onrender.com/saml/acs` |
| `SAML_LOGOUT_URL` | Logout callback URL | `https://workerconnectbackend.onrender.com/saml/logout` |
| `SAML_ENTRY_POINT` | STA SSO URL | `https://tenant.safenetidp.com/saml/sso` |
| `SAML_ISSUER` | STA Entity ID | `https://tenant.safenetidp.com` |
| `SAML_IDP_CERT` | STA public certificate | `-----BEGIN CERTIFICATE-----...` |
| `SAML_SP_CERT` | SP certificate (optional) | `-----BEGIN CERTIFICATE-----...` |
| `SAML_SP_PRIVATE_KEY` | SP private key (optional) | `-----BEGIN PRIVATE KEY-----...` |
| `SAML_NAME_ID_FORMAT` | NameID format | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` |

### Verify Configuration

Check SAML configuration status:

**For Render deployment:**
```bash
curl https://workerconnectbackend.onrender.com/saml/config
```

**For local development:**
```bash
curl http://localhost:3001/saml/config
```

This endpoint is only available in development mode and shows:
- Configuration validation status
- Missing required settings
- Configuration summary

## Testing

### 1. Test Metadata Endpoint

**For Render deployment:**
```bash
curl https://workerconnectbackend.onrender.com/metadata
```

**For local development:**
```bash
curl http://localhost:3001/metadata
```

Should return XML metadata.

### 2. Test SAML Login Flow

**For Render deployment:**
1. Open browser: `https://workerconnectbackend.onrender.com/saml/login`
2. You should be redirected to STA login page
3. After login, you'll be redirected back to `/saml/acs`
4. Then redirected to `/dashboard` (or JSON response if API call)

**For local development:**
1. Open browser: `http://localhost:3001/saml/login`
2. You should be redirected to STA login page
3. After login, you'll be redirected back to `/saml/acs`
4. Then redirected to `/dashboard` (or JSON response if API call)

### 3. Test Card Scan Flow

**For Render deployment:**
```bash
# Simulate card scan
curl -X POST https://workerconnectbackend.onrender.com/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "12345"}'
```

**For local development:**
```bash
# Simulate card scan
curl -X POST http://localhost:3001/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "12345"}'
```

This will:
1. Store `cardId` in session
2. Redirect to `/saml/login`
3. After STA authentication, validate that STA user matches `cardId`

### 4. Test Authentication Status

**For Render deployment:**
```bash
curl https://workerconnectbackend.onrender.com/saml/status
```

**For local development:**
```bash
curl http://localhost:3001/saml/status
```

Returns current authentication status and user info.

### 5. Test Logout

**For Render deployment:**
```bash
curl -X POST https://workerconnectbackend.onrender.com/saml/logout
```

**For local development:**
```bash
curl -X POST http://localhost:3001/saml/logout
```

Clears session and logs out user.

## Card Reader Integration

### Current Implementation

The `/card-scan` endpoint accepts POST requests with `cardId`:

```json
{
  "cardId": "12345"
}
```

### Future Integration Options

#### Option 1: Serial Port (Node.js)

Install `serialport` package:

```bash
npm install serialport
```

Create a card reader service:

```javascript
import { SerialPort } from 'serialport';

const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });

port.on('data', async (data) => {
  const cardId = data.toString().trim();
  // Send to /card-scan endpoint
  await fetch('http://localhost:3001/card-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId })
  });
});
```

#### Option 2: USB HID (Node.js)

Install `node-hid` package:

```bash
npm install node-hid
```

#### Option 3: HTTP Webhook

Configure card reader to send HTTP POST requests directly to `/card-scan`.

### Card Validation Logic

After SAML authentication, the backend validates:

1. **Extract User Identifier** from SAML response:
   - `employeeNumber` attribute (preferred)
   - `nameID` (fallback)

2. **Compare with Scanned Card**:
   - If `userIdentifier !== scannedCardId` → **Access Denied**
   - If `userIdentifier === scannedCardId` → **Access Granted**

3. **Session Creation**:
   - Store user info in session
   - Redirect to dashboard

## API Endpoints

### SAML Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/saml/login` | Initiate SAML authentication |
| POST | `/saml/acs` | SAML callback (handled automatically) |
| POST | `/saml/logout` | Logout user |
| GET | `/metadata` | Service Provider metadata XML |
| POST | `/card-scan` | Card reader scan endpoint |
| GET | `/saml/status` | Check authentication status |
| GET | `/saml/config` | SAML config status (dev only) |

### Request/Response Examples

#### Card Scan

**Request:**
```bash
POST /card-scan
Content-Type: application/json

{
  "cardId": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Card scan received. Redirecting to SAML login.",
  "data": {
    "cardId": "12345",
    "redirectTo": "/saml/login"
  }
}
```

#### Authentication Status

**Request:**
```bash
GET /saml/status
```

**Response (Authenticated):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "nameID": "12345",
      "employeeNumber": "12345",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "authenticatedAt": "2024-01-15T10:30:00.000Z"
    },
    "pendingCardId": null
  }
}
```

**Response (Not Authenticated):**
```json
{
  "success": true,
  "data": {
    "authenticated": false,
    "user": null,
    "pendingCardId": "12345"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "SAML_ENTRY_POINT is not configured"

**Solution:** Set `SAML_ENTRY_POINT` in `.env` file with your STA SSO URL.

#### 2. "Invalid SAML response"

**Possible Causes:**
- Certificate mismatch
- URL mismatch (ACS URL doesn't match STA configuration)
- Clock skew (server time difference)

**Solutions:**
- Verify `SAML_IDP_CERT` matches STA certificate
- Verify `SAML_ACS_URL` matches STA ACS URL configuration
- Ensure server time is synchronized

#### 3. "Card ID does not match authenticated user"

**Possible Causes:**
- STA not sending `employeeNumber` attribute
- NameID format mismatch
- Attribute mapping incorrect in STA

**Solutions:**
- Configure `employeeNumber` attribute in STA
- Ensure NameID or employeeNumber matches card ID
- Check attribute mapping in STA console

#### 4. Session not persisting

**Possible Causes:**
- CORS configuration
- Cookie settings
- Session secret not set

**Solutions:**
- Ensure `credentials: true` in CORS
- Check cookie `sameSite` and `secure` settings
- Set `SESSION_SECRET` in `.env`

#### 5. Redirect loop

**Possible Causes:**
- Incorrect callback URL
- Session issues
- SAML configuration mismatch

**Solutions:**
- Verify all URLs match between backend and STA
- Clear browser cookies
- Check SAML configuration validation

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

This will log:
- SAML profile data
- Card validation results
- Session operations
- Configuration validation

### Testing with SAML Test Tools

You can use online SAML test tools like:
- [SAML Test Connector](https://samltest.id/)
- [OneLogin SAML Tester](https://www.onelogin.com/developer/saml-testing-tool)

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production
2. **Session Secret**: Use a strong, random session secret
3. **Private Keys**: Never commit private keys to version control
4. **Certificate Validation**: Always validate SAML responses
5. **Card ID Validation**: Always validate card ID matches STA user
6. **Session Timeout**: Configure appropriate session timeout
7. **CSRF Protection**: Ensure `sameSite` cookie attribute is set

## Production Deployment

### Checklist

- [ ] Use HTTPS for all SAML endpoints
- [ ] Set strong `SESSION_SECRET`
- [ ] Configure production URLs in `.env`
- [ ] Use proper SSL certificates (not self-signed)
- [ ] Configure STA with production URLs
- [ ] Test end-to-end authentication flow
- [ ] Set up monitoring and logging
- [ ] Configure session store (Redis recommended for multi-server)
- [ ] Set up proper error handling
- [ ] Review security settings

### Session Store (Multi-Server)

For production with multiple servers, use Redis session store:

```bash
npm install connect-redis redis
```

```javascript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... other session config
}));
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review SAML configuration
3. Check STA console logs
4. Enable debug logging
5. Review server logs

## Additional Resources

- [SAML 2.0 Specification](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Passport SAML Documentation](https://github.com/node-saml/passport-saml)
- [SafeNet Trusted Access Documentation](https://support.safenetidp.com/)



