# SafeNet STA Attribute Mapping Fix

## Problem

SAML authentication succeeds but user attributes are undefined:
```
📋 SAML Profile received: {
  nameID: 'G-f858647f-930f-44b4-b63d-3234ad16c508',
  employeeNumber: undefined,
  email: undefined
}
```

## Root Cause

SafeNet Trusted Access is not configured to send user attributes (email, employeeNumber) in the SAML assertion.

## Solution: Configure Attribute Mapping in STA

### Step 1: Log into SafeNet STA Console

1. Go to: https://console.safenetid.com (or your tenant URL)
2. Navigate to **Applications** → Select your WorkerConnect app

### Step 2: Configure SAML Attributes

1. Go to **SAML** tab
2. Find **Attribute Statements** or **Attribute Mapping** section
3. Add the following attributes:

| Attribute Name | SAML Attribute Name | Value/Source | Format |
|---------------|---------------------|--------------|--------|
| `email` | `email` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | User's email address | Basic |
| `employeeNumber` | `employeeNumber` | User's employee ID or card number | Basic |
| `firstName` | `firstName` or `givenName` | User's first name | Basic |
| `lastName` | `lastName` or `surname` | User's last name | Basic |

### Step 3: Example Configuration

**Option A: Basic Attributes**
```
Name: email
Format: Basic
Value: user.email

Name: employeeNumber  
Format: Basic
Value: user.employeeId (or custom field)

Name: firstName
Format: Basic
Value: user.firstName

Name: lastName
Format: Basic
Value: user.lastName
```

**Option B: URI-Format Attributes**
```
Name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
Format: URI
Value: user.email

Name: employeeNumber
Format: Basic
Value: user.employeeId
```

### Step 4: Map Custom Fields (if needed)

If your STA users don't have standard fields, you may need to use custom user attributes:

1. Go to **Users** → Edit a user
2. Add **Custom Attributes**:
   - `employeeNumber` = Card ID or Employee ID
   - `email` = User's email
3. In SAML attribute mapping, reference these custom attributes

### Step 5: Test & Verify

1. Save the SAML configuration
2. Initiate SAML login from mobile app
3. Check backend logs for SAML profile:
   ```
   📋 SAML Profile received: {
     nameID: 'G-f858647f-930f-44b4-b63d-3234ad16c508',
     employeeNumber: '12345',  // ✅ Should now have value
     email: 'user@example.com'  // ✅ Should now have value
   }
   ```

## Alternative: Update Backend to Use NameID

If you cannot configure STA attributes, you can use the `nameID` as the identifier:

### Update SAML Route Handler

```javascript
// In src/routes/saml.js - acsHandler function
req.session.user = {
  nameID: samlUser.nameID,
  workerId: samlUser.employeeNumber || samlUser.nameID, // ✅ Fallback to nameID
  employeeNumber: samlUser.employeeNumber || samlUser.nameID,
  email: samlUser.email || `${samlUser.nameID}@workerconnect.app`, // ✅ Generate email
  firstName: samlUser.firstName || 'Worker',
  lastName: samlUser.lastName || 'User',
  name: samlUser.firstName && samlUser.lastName 
    ? `${samlUser.firstName} ${samlUser.lastName}`.trim()
    : samlUser.nameID, // ✅ Fallback to nameID
  cardId: samlUser.employeeNumber || samlUser.nameID,
  establishmentId: null,
  role: req.session.loginRole || 'worker',
};
```

## Recommended Attributes for WorkerConnect

For best results, configure these attributes in STA:

1. **Required**:
   - `email` - For user identification and notifications
   - `employeeNumber` - For card scan validation

2. **Recommended**:
   - `firstName` - For display name
   - `lastName` - For display name
   - `phoneNumber` - For additional contact

3. **Optional**:
   - `department` - For authorization
   - `jobTitle` - For display
   - `location` - For tracking

## Verification

Once configured, your logs should show:

```
✅ SAML authentication successful
👤 User: {
  nameID: 'G-f858647f-930f-44b4-b63d-3234ad16c508',
  employeeNumber: '12345',
  email: 'worker@example.com'
}
✅ [SAML] Session created for worker@example.com as worker
```
