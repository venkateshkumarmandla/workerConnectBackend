# SafeNet Trusted Access (STA) Configuration Guide

This document contains all the information needed to configure WorkerConnect Backend as a Service Provider (SP) in SafeNet Trusted Access.

## Quick Links

### 1. Service Provider Metadata (XML)
**Use this for automatic configuration:**

```
https://workerconnectbackend.onrender.com/metadata
```

**How to use:**
1. Open the link above in your browser
2. Right-click and "Save As" → Save as `sp-metadata.xml`
3. In STA Admin Console: **Applications** → **Add Application** → **SAML 2.0** → **Upload Metadata**
4. Upload the `sp-metadata.xml` file

---

## Manual Configuration

If you prefer to configure manually or need to verify settings, use the following:

### Service Provider (SP) Details

| Setting | Value |
|---------|-------|
| **Entity ID** | `https://workerconnectbackend.onrender.com/saml/metadata` |
| **Assertion Consumer Service (ACS) URL** | `https://workerconnectbackend.onrender.com/saml/acs` |
| **Single Logout Service (SLO) URL** | `https://workerconnectbackend.onrender.com/saml/logout` |
| **NameID Format** | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` |
| **Signature Algorithm** | `SHA-256` |
| **Digest Algorithm** | `SHA-256` |

### Step-by-Step Manual Configuration

#### Step 1: Create New Application in STA

1. Log in to SafeNet Trusted Access Admin Console
2. Navigate to **Applications** → **Add Application**
3. Select **SAML 2.0** as the application type
4. Choose **Manual Configuration** (or skip if using metadata upload)

#### Step 2: Basic Application Settings

- **Application Name**: `WorkerConnect Backend`
- **Description**: `SAML authentication for WorkerConnect Backend API`
- **Application Type**: `SAML 2.0`

#### Step 3: SAML Configuration

**Entity ID / Issuer:**
```
https://workerconnectbackend.onrender.com/saml/metadata
```

**Assertion Consumer Service (ACS) URL:**
```
https://workerconnectbackend.onrender.com/saml/acs
```
- **Binding**: `HTTP POST`
- **Index**: `0` (or leave default)

**Single Logout Service (SLO) URL:**
```
https://workerconnectbackend.onrender.com/saml/logout
```
- **Binding**: `HTTP POST` or `HTTP Redirect`

**NameID Format:**
```
urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
```

#### Step 4: Security Settings

- **Sign Assertions**: `Yes` (Recommended)
- **Encrypt Assertions**: `No` (Optional, can be enabled if needed)
- **Signature Algorithm**: `SHA-256`
- **Digest Algorithm**: `SHA-256`

#### Step 5: Attribute Mapping

Configure the following attributes to be sent in the SAML response:

**Required Attributes:**

1. **NameID** (Primary Identifier)
   - **Format**: `Persistent` or `Unspecified`
   - **Value**: Employee Number / Card ID
   - **Purpose**: Used to match with scanned card ID

2. **employeeNumber** (Custom Attribute)
   - **Attribute Name**: `employeeNumber`
   - **Attribute Format**: `Basic`
   - **Value**: Employee Number / Card ID
   - **Purpose**: Must match the card ID scanned by the card reader

**Optional Attributes:**

3. **Email**
   - **Attribute Name**: `email` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - **Value**: User's email address

4. **First Name**
   - **Attribute Name**: `firstName` or `givenName`
   - **Value**: User's first name

5. **Last Name**
   - **Attribute Name**: `lastName` or `surname`
   - **Value**: User's last name

**Important:** The `employeeNumber` attribute (or NameID) **must** match the card ID that users scan. This is critical for card-based authentication.

#### Step 6: User Assignment

- Assign users or groups to the application
- Ensure users have an `employeeNumber` attribute that matches their card ID

#### Step 7: Save and Test

1. Save the application configuration
2. Test the SAML connection:
   - Visit: `https://workerconnectbackend.onrender.com/saml/login`
   - You should be redirected to STA login page
   - After authentication, you'll be redirected back

---

## Configuration Summary for STA Admin

**Copy this section and share with your STA administrator:**

```
APPLICATION NAME: WorkerConnect Backend
APPLICATION TYPE: SAML 2.0 Service Provider

METADATA URL (for automatic configuration):
https://workerconnectbackend.onrender.com/metadata

MANUAL CONFIGURATION:
- Entity ID: https://workerconnectbackend.onrender.com/saml/metadata
- ACS URL: https://workerconnectbackend.onrender.com/saml/acs
- Logout URL: https://workerconnectbackend.onrender.com/saml/logout
- NameID Format: urn:oasis:names:tc:SAML:2.0:nameid-format:persistent

REQUIRED ATTRIBUTES:
- NameID: Must contain Employee Number / Card ID
- employeeNumber: Must contain Employee Number / Card ID (must match card scan)

IMPORTANT: The employeeNumber or NameID value MUST match the card ID 
scanned by the card reader for authentication to succeed.
```

---

## Testing the Configuration

After configuring in STA, test the following:

### 1. Test Metadata Endpoint
```bash
curl https://workerconnectbackend.onrender.com/metadata
```
Should return XML metadata.

### 2. Test SAML Login
```bash
curl -L https://workerconnectbackend.onrender.com/saml/login
```
Should redirect to STA login page.

### 3. Test Card Scan Flow
```bash
curl -X POST https://workerconnectbackend.onrender.com/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "YOUR_CARD_ID"}'
```

### 4. Check Configuration Status
```bash
curl https://workerconnectbackend.onrender.com/saml/config
```
(Only available in development mode)

---

## Getting STA Configuration

After configuring the application in STA, you need to get the following information for your backend `.env` file:

### 1. STA Entry Point (SSO URL)
- In STA Admin Console, go to your application
- Look for **SAML SSO URL** or **Entry Point**
- Format: `https://<tenant>.safenetidp.com/saml/sso`
- Copy to: `SAML_ENTRY_POINT` in `.env`

### 2. STA Issuer / Entity ID
- In STA Admin Console, go to your application
- Look for **Entity ID** or **Issuer**
- Format: `https://<tenant>.safenetidp.com`
- Copy to: `SAML_ISSUER` in `.env`

### 3. STA Certificate (IDP Certificate)
- In STA Admin Console, go to your application
- Download **IDP Metadata** or **SAML Metadata**
- Extract the certificate from the metadata XML
- Or download the certificate directly
- Copy to: `SAML_IDP_CERT` in `.env`

**Certificate format:**
```
-----BEGIN CERTIFICATE-----
[Certificate content here]
-----END CERTIFICATE-----
```

---

## Backend Environment Variables

After getting STA configuration, update your backend `.env` file:

```env
# Service Provider Configuration
SAML_ENTITY_ID=https://workerconnectbackend.onrender.com/saml/metadata
SAML_ACS_URL=https://workerconnectbackend.onrender.com/saml/acs
SAML_LOGOUT_URL=https://workerconnectbackend.onrender.com/saml/logout

# SafeNet Trusted Access Configuration (from STA)
SAML_ENTRY_POINT=https://your-tenant.safenetidp.com/saml/sso
SAML_ISSUER=https://your-tenant.safenetidp.com
SAML_IDP_CERT=-----BEGIN CERTIFICATE-----
[Paste STA certificate here]
-----END CERTIFICATE-----

# Session Configuration
SESSION_SECRET=your-strong-random-secret-here

# Optional: Service Provider Certificates (for request signing)
SAML_SP_CERT=-----BEGIN CERTIFICATE-----
[Your SP certificate]
-----END CERTIFICATE-----

SAML_SP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[Your SP private key]
-----END PRIVATE KEY-----
```

---

## Troubleshooting

### Issue: Metadata not accessible
- Ensure your Render deployment is running
- Check that the URL is accessible: `https://workerconnectbackend.onrender.com/metadata`
- Verify HTTPS is working (Render provides this automatically)

### Issue: SAML authentication fails
- Verify all URLs match exactly (case-sensitive)
- Check that STA certificate is correctly formatted
- Ensure `employeeNumber` attribute is configured in STA
- Verify NameID format matches

### Issue: Card ID validation fails
- Ensure `employeeNumber` attribute in STA matches card ID format
- Check that NameID or employeeNumber is being sent in SAML response
- Verify attribute mapping in STA is correct

---

## Support

For additional help:
- See [SAML_SETUP.md](./SAML_SETUP.md) for complete setup guide
- See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for Render-specific details
- Check backend logs for SAML authentication errors

---

## Quick Reference Card

**For STA Administrator:**

```
METADATA URL: https://workerconnectbackend.onrender.com/metadata

ENTITY ID: https://workerconnectbackend.onrender.com/saml/metadata
ACS URL: https://workerconnectbackend.onrender.com/saml/acs
LOGOUT URL: https://workerconnectbackend.onrender.com/saml/logout
NAMEID FORMAT: urn:oasis:names:tc:SAML:2.0:nameid-format:persistent

REQUIRED: employeeNumber attribute must match card ID
```

