#!/bin/bash
# Get Local IP Address for Mobile App Development
# Run: ./get-ip.sh

echo ""
echo "📡 Local IP Addresses for Mobile App Development"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get local IP addresses based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
else
    # Linux
    IPS=$(hostname -I 2>/dev/null || ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1)
fi

if [ -z "$IPS" ]; then
    echo "❌ No local IP addresses found."
    echo "   Make sure you are connected to a network."
    echo ""
    exit 1
fi

INDEX=1
for IP in $IPS; do
    echo "$INDEX. Network Interface"
    echo "   IP: $IP"
    echo ""
    INDEX=$((INDEX + 1))
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Copy one of the IP addresses above (usually Wi-Fi)"
echo "2. Edit: src/api/config.ts"
echo "3. Set: USE_LOCAL_IP = true"
echo "4. Set: LOCAL_IP_ADDRESS = \"YOUR_IP_ADDRESS\""
echo "5. Rebuild your mobile app"
echo ""

echo "💡 For Backend:"
echo ""
echo "Make sure your backend is running with Docker:"
echo "   cd backend"
echo "   docker-compose up -d"
echo ""

# Get first IP as suggested
SUGGESTED_IP=$(echo $IPS | awk '{print $1}')

if [ ! -z "$SUGGESTED_IP" ]; then
    echo "🎯 Suggested IP: $SUGGESTED_IP"
    echo ""
    echo "Your mobile app should use: http://$SUGGESTED_IP:3001/api"
    echo ""
fi

# Try to copy to clipboard (optional, may not work on all systems)
if command -v pbcopy &> /dev/null; then
    # macOS
    echo $SUGGESTED_IP | pbcopy
    echo "✅ IP address copied to clipboard!"
    echo ""
elif command -v xclip &> /dev/null; then
    # Linux with xclip
    echo $SUGGESTED_IP | xclip -selection clipboard
    echo "✅ IP address copied to clipboard!"
    echo ""
fi

