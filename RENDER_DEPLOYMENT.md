# Render Deployment Configuration

This guide covers the specific configuration needed for deploying the SAML authentication to Render.

## Render URL

**Production URL:** `https://workerconnectbackend.onrender.com`

## SAML Endpoints

All SAML endpoints are available at:

- **Metadata**: `https://workerconnectbackend.onrender.com/metadata`
- **Login**: `https://workerconnectbackend.onrender.com/saml/login`
- **ACS Callback**: `https://workerconnectbackend.onrender.com/saml/acs`
- **Logout**: `https://workerconnectbackend.onrender.com/saml/logout`
- **Card Scan**: `https://workerconnectbackend.onrender.com/card-scan`
- **Status**: `https://workerconnectbackend.onrender.com/saml/status`

## Environment Variables for Render

Configure these in your Render dashboard under **Environment**:

```env
# Session Configuration
SESSION_SECRET=your-strong-random-secret-here

# Service Provider Configuration
SAML_ENTITY_ID=https://workerconnectbackend.onrender.com/saml/metadata
SAML_ACS_URL=https://workerconnectbackend.onrender.com/saml/acs
SAML_LOGOUT_URL=https://workerconnectbackend.onrender.com/saml/logout

# SafeNet Trusted Access Configuration
SAML_ENTRY_POINT=https://your-tenant.safenetidp.com/saml/sso
SAML_ISSUER=https://your-tenant.safenetidp.com
SAML_IDP_CERT=-----BEGIN CERTIFICATE-----
[Paste STA certificate here]
-----END CERTIFICATE-----

# Optional: Service Provider Certificates
SAML_SP_CERT=-----BEGIN CERTIFICATE-----
[Your SP certificate]
-----END CERTIFICATE-----

SAML_SP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[Your SP private key]
-----END PRIVATE KEY-----

# SAML Protocol Settings
SAML_NAME_ID_FORMAT=urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
SAML_SIGNATURE_ALGORITHM=sha256
SAML_DIGEST_ALGORITHM=sha256
```

## Important Notes for Render

### 1. HTTPS is Required

Render provides HTTPS automatically. All SAML URLs must use `https://`:
- ✅ `https://workerconnectbackend.onrender.com/saml/acs`
- ❌ `http://workerconnectbackend.onrender.com/saml/acs`

### 2. Session Configuration

For Render, you may want to use a Redis session store for better reliability:

```bash
# Add to package.json dependencies
npm install connect-redis redis
```

Then update `src/server.js`:

```javascript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL // Render provides this automatically
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... rest of session config
}));
```

### 3. Cookie Settings

The session cookie is configured for HTTPS in production:

```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production', // true on Render
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: 'lax'
}
```

### 4. CORS Configuration

Update `FRONTEND_URL` in Render environment variables to match your frontend URL.

### 5. Getting SP Metadata

1. Deploy your application to Render
2. Visit: `https://workerconnectbackend.onrender.com/metadata`
3. Save the XML metadata
4. Upload to SafeNet Trusted Access

### 6. SafeNet Trusted Access Configuration

When configuring STA, use these URLs:

- **Entity ID**: `https://workerconnectbackend.onrender.com/saml/metadata`
- **ACS URL**: `https://workerconnectbackend.onrender.com/saml/acs`
- **Logout URL**: `https://workerconnectbackend.onrender.com/saml/logout`

## Testing on Render

### Test Metadata
```bash
curl https://workerconnectbackend.onrender.com/metadata
```

### Test Login
```bash
curl -L https://workerconnectbackend.onrender.com/saml/login
```

### Test Card Scan
```bash
curl -X POST https://workerconnectbackend.onrender.com/card-scan \
  -H "Content-Type: application/json" \
  -d '{"cardId": "12345"}'
```

### Test Status
```bash
curl https://workerconnectbackend.onrender.com/saml/status
```

## Troubleshooting

### Issue: SAML redirects not working

**Solution:** Ensure all URLs in `.env` use `https://` not `http://`

### Issue: Session not persisting

**Solution:** 
1. Check `SESSION_SECRET` is set in Render environment
2. Consider using Redis session store
3. Verify cookie settings allow HTTPS

### Issue: CORS errors

**Solution:** Update `FRONTEND_URL` in Render environment variables

### Issue: Certificate errors

**Solution:** Ensure all certificates are properly formatted with `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` markers

## Render Environment Variables Checklist

- [ ] `SESSION_SECRET` - Strong random secret
- [ ] `SAML_ENTITY_ID` - `https://workerconnectbackend.onrender.com/saml/metadata`
- [ ] `SAML_ACS_URL` - `https://workerconnectbackend.onrender.com/saml/acs`
- [ ] `SAML_LOGOUT_URL` - `https://workerconnectbackend.onrender.com/saml/logout`
- [ ] `SAML_ENTRY_POINT` - Your STA SSO URL
- [ ] `SAML_ISSUER` - Your STA Entity ID
- [ ] `SAML_IDP_CERT` - STA certificate
- [ ] `SAML_SP_CERT` - SP certificate (optional)
- [ ] `SAML_SP_PRIVATE_KEY` - SP private key (optional)
- [ ] `FRONTEND_URL` - Your frontend URL for CORS

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [SAML Setup Guide](./SAML_SETUP.md)
- [Quick Start Guide](./SAML_QUICK_START.md)

