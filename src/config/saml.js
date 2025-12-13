/**
 * SAML Configuration for SafeNet Trusted Access (STA)
 * 
 * This file contains the SAML Service Provider (SP) configuration
 * that will be used to authenticate users via SafeNet Trusted Access.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import saml from 'passport-saml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SAML Configuration Object
 * 
 * This configuration defines how our Express app (Service Provider)
 * communicates with SafeNet Trusted Access (Identity Provider).
 */
export const samlConfig = {
  // ============================================
  // SERVICE PROVIDER (SP) CONFIGURATION
  // ============================================

  // Entity ID - Unique identifier for this Service Provider
  // This must match what you configure in STA
  // Format: Usually a URL like https://yourdomain.com/saml/metadata
  entityId: process.env.SAML_ENTITY_ID || 'https://workerconnectbackend.onrender.com/saml/metadata',

  // Assertion Consumer Service (ACS) URL
  // This is where STA will send the SAML response after authentication
  // Must match the route: /saml/acs
  callbackUrl: process.env.SAML_ACS_URL || 'https://workerconnectbackend.onrender.com/saml/acs',

  // Single Logout Service (SLO) URL
  // This is where STA will send logout requests
  // Must match the route: /saml/logout
  logoutUrl: process.env.SAML_LOGOUT_URL || 'https://workerconnectbackend.onrender.com/saml/logout',

  // ============================================
  // IDENTITY PROVIDER (IDP) CONFIGURATION
  // ============================================

  // STA Entry Point URL
  // This is the SAML SSO URL provided by SafeNet Trusted Access
  // Format: https://<tenant>.safenetidp.com/saml/sso
  entryPoint: process.env.SAML_ENTRY_POINT || 'https://idp.eu.safenetid.com/auth/realms/2UUO14PJ1G-STA/protocol/saml',

  // STA Issuer/Entity ID
  // This is the Entity ID of your SafeNet Trusted Access tenant
  // You'll get this from STA metadata
  issuer: process.env.SAML_ISSUER || 'https://idp.eu.safenetid.com/auth/realms/2UUO14PJ1G-STA',

  // STA Certificate
  // This is the public certificate from SafeNet Trusted Access
  // You can get this from STA metadata or download it from STA console
  // It's used to verify SAML responses are from STA
  // STA Certificate
  // This is the public certificate from SafeNet Trusted Access
  // We read it from the certs/idp.crt file
  cert: process.env.SAML_IDP_CERT || (() => {
    try {
      const certPath = path.join(__dirname, '../../certs/idp.crt');
      if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️  SAML IDP certificate file not found. Using fallback.');
    }
    // Fallback or placeholder - but file is preferred
    return null;
  })(),

  // ============================================
  // CERTIFICATE CONFIGURATION
  // ============================================

  // Service Provider Private Key
  // Generate this using: openssl genrsa -out sp-private-key.pem 2048
  // Store the path or the key content in environment variable
  privateKey: process.env.SAML_SP_PRIVATE_KEY || (() => {
    try {
      const keyPath = path.join(__dirname, '../../sp-key.pem');
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️  SAML private key file not found. Using environment variable.');
    }
    return null;
  })(),

  // Service Provider Certificate
  // Generate this using: openssl req -new -x509 -key sp-private-key.pem -out sp-certificate.pem -days 365
  // Store the path or the cert content in environment variable
  publicCert: process.env.SAML_SP_CERT || (() => {
    try {
      const certPath = path.join(__dirname, '../../sp-cert.pem');
      if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️  SAML certificate file not found. Using environment variable.');
    }
    return null;
  })(),

  // ============================================
  // SAML PROTOCOL SETTINGS
  // ============================================

  // NameID Format
  // Common formats:
  // - urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
  // - urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified
  // - urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
  // - urn:oasis:names:tc:SAML:2.0:nameid-format:transient
  // For card-based login, use persistent or unspecified
  nameIDFormat: process.env.SAML_NAME_ID_FORMAT || 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',

  // Signature Algorithm
  signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',

  // Digest Algorithm
  digestAlgorithm: process.env.SAML_DIGEST_ALGORITHM || 'sha256',

  // Force Authentication
  // If true, user must re-authenticate even if already logged in
  forceAuthn: false,

  // Request signing
  // Whether to sign SAML requests
  wantAssertionsSigned: true,
  wantMessageSigned: true,

  // Additional context
  additionalParams: {},
  additionalAuthorizeParams: {},

  // ============================================
  // ATTRIBUTE MAPPING
  // ============================================

  // Attribute names that STA will send
  // Map these to the attributes you configure in STA
  // Common attributes:
  // - NameID (the primary identifier)
  // - employeeNumber (card ID)
  // - email
  // - firstName
  // - lastName
  attributeMap: {
    // Map STA attributes to user object properties
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'nameID',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'roles',
    // Custom attribute for employee number / card ID
    'employeeNumber': 'employeeNumber',
    'cardId': 'cardId',
  },

  // ============================================
  // PASSPORT SAML STRATEGY CONFIGURATION
  // ============================================

  // Passport SAML Strategy Options
  // This will be used to create the SAML strategy
  getPassportSamlOptions: function () {
    return {
      // Service Provider configuration
      entryPoint: this.entryPoint,
      // IMPORTANT: 'issuer' in passport-saml is the SP's entityID, NOT the IDP's issuer!
      issuer: this.entityId,  // This is YOUR SP's identifier
      callbackUrl: this.callbackUrl,
      logoutUrl: this.logoutUrl,
      cert: this.cert,

      // Certificate for signing requests (optional but recommended)
      privateKey: this.privateKey,
      decryptionPvk: this.privateKey,
      privateCert: this.publicCert,

      // Protocol settings
      identifierFormat: this.nameIDFormat,
      signatureAlgorithm: this.signatureAlgorithm,
      digestAlgorithm: this.digestAlgorithm,

      // Security settings
      wantAssertionsSigned: this.wantAssertionsSigned,
      wantMessageSigned: this.wantMessageSigned,
      forceAuthn: this.forceAuthn,

      // Additional parameters
      additionalParams: this.additionalParams,
      additionalAuthorizeParams: this.additionalAuthorizeParams,

      // Attribute mapping
      // Passport-saml will automatically map attributes based on the SAML response
      // You can access them in the profile object
    };
  }
};

/**
 * Validate SAML Configuration
 * Checks if all required SAML configuration is present
 */
export const validateSamlConfig = () => {
  const errors = [];

  if (!samlConfig.entryPoint || samlConfig.entryPoint.includes('your-tenant')) {
    errors.push('SAML_ENTRY_POINT is not configured');
  }

  if (!samlConfig.issuer || samlConfig.issuer.includes('your-tenant')) {
    errors.push('SAML_ISSUER is not configured');
  }

  if (!samlConfig.cert || samlConfig.cert.includes('YOUR_STA_CERTIFICATE')) {
    errors.push('SAML_IDP_CERT is not configured');
  }

  if (!samlConfig.entityId || samlConfig.entityId.includes('yourdomain')) {
    errors.push('SAML_ENTITY_ID is not configured');
  }

  if (!samlConfig.privateKey) {
    console.warn('⚠️  SAML_SP_PRIVATE_KEY is not configured. Request signing may not work.');
  }

  if (!samlConfig.publicCert) {
    console.warn('⚠️  SAML_SP_CERT is not configured. Metadata may be incomplete.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default samlConfig;



