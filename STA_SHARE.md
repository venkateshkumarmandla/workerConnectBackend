# Information to Share with SafeNet Trusted Access Administrator

**Application Name:** WorkerConnect Backend  
**Application Type:** SAML 2.0 Service Provider  
**Deployment URL:** https://workerconnectbackend.onrender.com

---

## Option 1: Automatic Configuration (Recommended)

**Metadata URL:**
```
https://workerconnectbackend.onrender.com/metadata
```

**Instructions:**
1. Open the metadata URL in a browser
2. Save the XML file (Right-click → Save As → `sp-metadata.xml`)
3. In STA Admin Console: **Applications** → **Add Application** → **SAML 2.0**
4. Select **Upload Metadata** and upload the `sp-metadata.xml` file
5. Configure attribute mapping (see below)

---

## Option 2: Manual Configuration

If automatic configuration is not available, use these settings:

### Basic Configuration

| Setting | Value |
|---------|-------|
| **Entity ID** | `https://workerconnectbackend.onrender.com/saml/metadata` |
| **Assertion Consumer Service (ACS) URL** | `https://workerconnectbackend.onrender.com/saml/acs` |
| **Single Logout Service (SLO) URL** | `https://workerconnectbackend.onrender.com/saml/logout` |
| **NameID Format** | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` |
| **Signature Algorithm** | `SHA-256` |
| **Digest Algorithm** | `SHA-256` |

### Detailed Settings

**Entity ID / Issuer:**
```
https://workerconnectbackend.onrender.com/saml/metadata
```

**Assertion Consumer Service (ACS) URL:**
```
https://workerconnectbackend.onrender.com/saml/acs
```
- **Binding:** HTTP POST
- **Index:** 0 (or default)

**Single Logout Service (SLO) URL:**
```
https://workerconnectbackend.onrender.com/saml/logout
```
- **Binding:** HTTP POST or HTTP Redirect

**NameID Format:**
```
urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
```

**Security Settings:**
- Sign Assertions: **Yes** (Recommended)
- Encrypt Assertions: No (Optional)
- Signature Algorithm: **SHA-256**
- Digest Algorithm: **SHA-256**

---

## Required Attribute Mapping

**CRITICAL:** The following attributes must be configured for card-based authentication to work:

### 1. NameID (Primary Identifier)
- **Format:** Persistent or Unspecified
- **Value:** Employee Number / Card ID
- **Purpose:** Primary identifier used for authentication

### 2. employeeNumber (Custom Attribute)
- **Attribute Name:** `employeeNumber`
- **Attribute Format:** Basic
- **Value:** Employee Number / Card ID
- **Purpose:** Must match the card ID scanned by the card reader

**⚠️ IMPORTANT:** The `employeeNumber` attribute (or NameID) **MUST** match the card ID that users scan. This is critical for the card-based authentication flow.

### Optional Attributes

3. **Email**
   - Attribute Name: `email` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - Value: User's email address

4. **First Name**
   - Attribute Name: `firstName` or `givenName`
   - Value: User's first name

5. **Last Name**
   - Attribute Name: `lastName` or `surname`
   - Value: User's last name

---

## What We Need Back from STA

After configuring the application in STA, please provide:

1. **STA Entry Point (SSO URL)**
   - Format: `https://<tenant>.safenetidp.com/saml/sso`
   - We'll use this for: `SAML_ENTRY_POINT`

2. **STA Issuer / Entity ID**
   - Format: `https://<tenant>.safenetidp.com`
   - We'll use this for: `SAML_ISSUER`

3. **STA Certificate (IDP Certificate)**
   - Can be extracted from STA metadata XML
   - Or downloaded directly from STA console
   - Format:
     ```
     -----BEGIN CERTIFICATE-----
     [Certificate content]
     -----END CERTIFICATE-----
     ```
   - We'll use this for: `SAML_IDP_CERT`

---

## Testing

After configuration, we can test:

1. **Metadata Endpoint:**
   ```
   https://workerconnectbackend.onrender.com/metadata
   ```

2. **SAML Login:**
   ```
   https://workerconnectbackend.onrender.com/saml/login
   ```

3. **Status Check:**
   ```
   https://workerconnectbackend.onrender.com/saml/status
   ```

---

## Summary for Quick Reference

```
METADATA URL: https://workerconnectbackend.onrender.com/metadata

ENTITY ID: https://workerconnectbackend.onrender.com/saml/metadata
ACS URL: https://workerconnectbackend.onrender.com/saml/acs
LOGOUT URL: https://workerconnectbackend.onrender.com/saml/logout
NAMEID FORMAT: urn:oasis:names:tc:SAML:2.0:nameid-format:persistent

REQUIRED ATTRIBUTE: employeeNumber (must match card ID)
```

---

## Contact

If you have questions about this configuration, please refer to:
- Complete setup guide: See project documentation
- Metadata XML: https://workerconnectbackend.onrender.com/metadata

