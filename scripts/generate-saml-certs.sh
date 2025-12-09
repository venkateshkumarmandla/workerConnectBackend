#!/bin/bash

# Script to generate Service Provider (SP) certificates for SAML authentication
# These certificates are used to sign SAML requests (optional but recommended)

echo "🔐 Generating SAML Service Provider Certificates"
echo "================================================"
echo ""

# Create certs directory if it doesn't exist
mkdir -p certs

# Check if certificates already exist
if [ -f "certs/sp-private-key.pem" ] || [ -f "certs/sp-certificate.pem" ]; then
    echo "⚠️  Certificates already exist in certs/ directory"
    read -p "Do you want to overwrite them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Certificate generation cancelled"
        exit 1
    fi
    echo ""
fi

# Generate private key (2048 bits)
echo "📝 Generating private key..."
openssl genrsa -out certs/sp-private-key.pem 2048

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate private key"
    exit 1
fi

echo "✅ Private key generated: certs/sp-private-key.pem"
echo ""

# Generate certificate
echo "📝 Generating certificate..."
echo "Please enter the following information:"
echo ""

openssl req -new -x509 -key certs/sp-private-key.pem -out certs/sp-certificate.pem -days 365

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate certificate"
    exit 1
fi

echo ""
echo "✅ Certificate generated: certs/sp-certificate.pem"
echo ""

# Set proper permissions
chmod 600 certs/sp-private-key.pem
chmod 644 certs/sp-certificate.pem

echo "🔒 Set proper file permissions"
echo ""

# Display certificate information
echo "📋 Certificate Information:"
echo "=========================="
openssl x509 -in certs/sp-certificate.pem -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After"
echo ""

echo "✨ Certificate generation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add these certificates to your .env file (SAML_SP_CERT and SAML_SP_PRIVATE_KEY)"
echo "   2. Or keep them in certs/ directory (they will be auto-loaded)"
echo "   3. Upload sp-certificate.pem to SafeNet Trusted Access"
echo "   4. Never commit the private key to version control!"
echo ""



