# Quick Reference: Links and Configuration for SafeNet Trusted Access

## 🔗 Direct Links to Share with STA Administrator

### 1. Metadata XML (Automatic Configuration)
```
https://workerconnectbackend.onrender.com/metadata
```
**How to use:** Open this link, save the XML file, and upload it to STA.

---

## 📋 Manual Configuration Values

Copy and paste these values into STA:

### Service Provider (SP) Configuration

**Entity ID:**
```
https://workerconnectbackend.onrender.com/saml/metadata
```

**Assertion Consumer Service (ACS) URL:**
```
https://workerconnectbackend.onrender.com/saml/acs
```
- Binding: HTTP POST

**Single Logout Service (SLO) URL:**
```
https://workerconnectbackend.onrender.com/saml/logout
```
- Binding: HTTP POST or HTTP Redirect

**NameID Format:**
```
urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
```

**Signature Algorithm:** SHA-256  
**Digest Algorithm:** SHA-256

---

## ⚙️ Required Attribute Mapping

**CRITICAL:** Configure these attributes in STA:

1. **NameID**
   - Format: Persistent or Unspecified
   - Value: Employee Number / Card ID

2. **employeeNumber** (Custom Attribute)
   - Attribute Name: `employeeNumber`
   - Value: Employee Number / Card ID
   - **Must match the card ID scanned by users**

---

## 📤 What We Need Back from STA

After STA configuration, please provide:

1. **STA Entry Point (SSO URL)**
   - Example: `https://your-tenant.safenetidp.com/saml/sso`

2. **STA Issuer / Entity ID**
   - Example: `https://your-tenant.safenetidp.com`

3. **STA Certificate**
   - Can be from metadata XML or downloaded directly
   - Format: `-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----`

---

## 🧪 Test Links

After configuration, test these:

- **Metadata:** https://workerconnectbackend.onrender.com/metadata
- **Login:** https://workerconnectbackend.onrender.com/saml/login
- **Status:** https://workerconnectbackend.onrender.com/saml/status

---

## 📄 Full Documentation

- **Complete Configuration Guide:** [STA_CONFIGURATION.md](./STA_CONFIGURATION.md)
- **Shareable Document:** [STA_SHARE.md](./STA_SHARE.md)
- **Setup Guide:** [SAML_SETUP.md](./SAML_SETUP.md)

