# Quick Start - Deploy Backend with Docker for Mobile App

## TL;DR - Fast Setup

### 1. Get Your Local IP Address
**Windows (PowerShell):**
```powershell
ipconfig | findstr IPv4
```

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Save this IP address (e.g., `192.168.1.100`)

### 2. Setup Backend
```bash
cd WorkerConnect-2/backend

# Create .env file (copy from env.example.txt and edit)
# Set FRONTEND_URL=* to allow mobile app access

# Start Docker container
docker-compose up -d --build
```

### 3. Verify It's Running
```bash
# Check container
docker-compose ps

# Test API (replace with your IP)
curl http://192.168.1.100:3001/health
```

### 4. Update Mobile App
Edit `WorkerConnect-2/src/api/api.ts`:
```typescript
// Change this line to use your IP
const BASE_URL = 'http://192.168.1.100:3001/api';
```

### 5. Rebuild Mobile App
```bash
cd WorkerConnect-2

# For Android
npm run build
npx cap sync android
npx cap open android

# For iOS
npm run build
npx cap sync ios
npx cap open ios
```

## That's It! 🎉

Your mobile app can now connect to your local backend via your IP address.

---

## Troubleshooting One-Liners

**Container not running?**
```bash
docker-compose logs
```

**Need to restart?**
```bash
docker-compose restart
```

**Port 3001 already in use?**
Change `PORT` in `.env` file and restart

**Mobile app can't connect?**
1. Check both devices are on same WiFi
2. Check firewall allows port 3001
3. Verify IP address hasn't changed

**Update code and redeploy?**
```bash
docker-compose down && docker-compose up -d --build
```

---

For detailed documentation, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

