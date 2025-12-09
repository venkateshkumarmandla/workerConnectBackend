# SAML Authentication - Quick Start Guide

This is a quick reference guide for setting up SAML authentication with SafeNet Trusted Access.

## Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Certificates (Optional)

```bash
./scripts/generate-saml-certs.sh
```

Or manually:
```bash
mkdir -p certs
openssl genrsa -out certs/sp-private-key.pem 2048
openssl req -new -x509 -key certs/sp-private-key.pem -out certs/sp-certificate.pem -days 365
```

### 3. Configure Environment

Copy and edit `.env`:

```bash
cp env.example.txt .env
```

**Minimum required configuration for Render deployment:**

```env
SESSION_SECRET=your-random-secret-here
SAML_ENTITY_ID=https://workerconnectbackend.onrender.com/saml/metadata
SAML_ACS_URL=https://workerconnectbackend.onrender.com/saml/acs
SAML_LOGOUT_URL=https://workerconnectbackend.onrender.com/saml/logout
SAML_ENTRY_POINT=https://your-tenant.safenetidp.com/saml/sso
SAML_ISSUER=https://your-tenant.safenetidp.com
SAML_IDP_CERT=-----BEGIN CERTIFICATE-----
[Paste STA certificate here]
-----END CERTIFICATE-----
```

### 4. Get SP Metadata

**For Render deployment:**
```bash
# Visit: https://workerconnectbackend.onrender.com/metadata
# Save the XML to sp-metadata.xml
```

**For local development:**
```bash
npm start
# Visit: http://localhost:3001/metadata
# Save the XML to sp-metadata.xml
```

### 5. Configure SafeNet Trusted Access

1. Login to STA Admin Console
2. **Applications** → **Add Application** → **SAML 2.0**
3. **Upload Metadata** → Upload `sp-metadata.xml`
4. Configure:
   - **Entity ID**: `https://workerconnectbackend.onrender.com/saml/metadata`
   - **ACS URL**: `https://workerconnectbackend.onrender.com/saml/acs`
   - **Logout URL**: `https://workerconnectbackend.onrender.com/saml/logout`
   - **NameID Format**: `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`
5. **Attribute Mapping**:
   - Map `employeeNumber` attribute to Card ID
   - Ensure NameID = employeeNumber
6. Download STA metadata and extract:
   - **Entry Point** → `SAML_ENTRY_POINT`
   - **Issuer** → `SAML_ISSUER`
   - **Certificate** → `SAML_IDP_CERT`

### 6. Test

**For Render deployment:**
```bash
# Test login
curl https://workerconnectbackend.onrender.com/saml/login

# Test card scan
curl -X POST https://workerconnectbackend.onrender.com/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "12345"}'

# Check status
curl https://workerconnectbackend.onrender.com/saml/status
```

**For local development:**
```bash
# Test login
curl http://localhost:3001/saml/login

# Test card scan
curl -X POST http://localhost:3001/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "12345"}'

# Check status
curl http://localhost:3001/saml/status
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/saml/login` | GET | Start SAML authentication |
| `/saml/acs` | POST | SAML callback (automatic) |
| `/saml/logout` | POST | Logout user |
| `/metadata` | GET | SP metadata XML |
| `/card-scan` | POST | Card reader scan |
| `/saml/status` | GET | Auth status |
| `/saml/config` | GET | Config status (dev) |

## Card Scan Flow

```javascript
// 1. Card scan
POST /card-scan
{ "cardId": "12345" }

// 2. Auto-redirect to /saml/login

// 3. User authenticates with STA

// 4. STA redirects to /saml/acs

// 5. Backend validates: STA user.employeeNumber === cardId

// 6. If match → Session created → Redirect to /dashboard
//    If mismatch → Access denied
```

## Environment Variables

**Required (for Render deployment):**
- `SESSION_SECRET` - Session encryption secret
- `SAML_ENTITY_ID` - SP Entity ID: `https://workerconnectbackend.onrender.com/saml/metadata`
- `SAML_ACS_URL` - ACS callback URL: `https://workerconnectbackend.onrender.com/saml/acs`
- `SAML_LOGOUT_URL` - Logout URL: `https://workerconnectbackend.onrender.com/saml/logout`
- `SAML_ENTRY_POINT` - STA SSO URL
- `SAML_ISSUER` - STA Entity ID
- `SAML_IDP_CERT` - STA certificate

**Optional:**
- `SAML_SP_CERT` - SP certificate (for request signing)
- `SAML_SP_PRIVATE_KEY` - SP private key
- `SAML_NAME_ID_FORMAT` - NameID format (default: persistent)

## Troubleshooting

### Configuration Check

```bash
curl http://localhost:3001/saml/config
```

### Common Issues

1. **"SAML_ENTRY_POINT is not configured"**
   → Set `SAML_ENTRY_POINT` in `.env`

2. **"Invalid SAML response"**
   → Check certificate and URL matching

3. **"Card ID does not match"**
   → Configure `employeeNumber` attribute in STA
   → Ensure NameID = employeeNumber

## Full Documentation

See [SAML_SETUP.md](./SAML_SETUP.md) for complete documentation.



