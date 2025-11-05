# Get Local IP Address for Mobile App Development
# Run: .\get-ip.ps1

Write-Host "`n📡 Local IP Addresses for Mobile App Development`n" -ForegroundColor Cyan
Write-Host ("━" * 60) -ForegroundColor Gray

# Get IPv4 addresses
$addresses = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "127.*" } |
    Select-Object InterfaceAlias, IPAddress

if ($addresses.Count -eq 0) {
    Write-Host "❌ No local IP addresses found." -ForegroundColor Red
    Write-Host "   Make sure you are connected to a network.`n" -ForegroundColor Yellow
    exit
}

$index = 1
foreach ($addr in $addresses) {
    Write-Host "$index. $($addr.InterfaceAlias)" -ForegroundColor White
    Write-Host "   IP: $($addr.IPAddress)" -ForegroundColor Green
    Write-Host ""
    $index++
}

Write-Host ("━" * 60) -ForegroundColor Gray
Write-Host "`n📝 Next Steps:`n" -ForegroundColor Cyan
Write-Host "1. Copy one of the IP addresses above (usually Wi-Fi)"
Write-Host "2. Edit: src/api/config.ts"
Write-Host "3. Set: USE_LOCAL_IP = true"
Write-Host "4. Set: LOCAL_IP_ADDRESS = `"YOUR_IP_ADDRESS`""
Write-Host "5. Rebuild your mobile app`n"

Write-Host "💡 For Backend:`n" -ForegroundColor Cyan
Write-Host "Make sure your backend is running with Docker:"
Write-Host "   cd backend"
Write-Host "   docker-compose up -d`n"

# Suggest the most likely IP (Wi-Fi)
$suggested = $addresses | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object -First 1

if ($null -ne $suggested) {
    Write-Host ("🎯 Suggested IP ({0}): {1}`n" -f $suggested.InterfaceAlias, $suggested.IPAddress) -ForegroundColor Yellow
    Write-Host ("Your mobile app should use: http://{0}:3001/api`n" -f $suggested.IPAddress) -ForegroundColor Green
}

# Copy suggested IP to clipboard if available
if ($null -ne $suggested) {
    $suggested.IPAddress | Set-Clipboard
    Write-Host "✅ IP address copied to clipboard!`n" -ForegroundColor Green
}

