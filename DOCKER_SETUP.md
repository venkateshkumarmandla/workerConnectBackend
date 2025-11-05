# Docker Deployment Guide - Mobile App Access

This guide will help you deploy the WorkerConnect backend on Docker and make it accessible to your mobile app via your local IP address.

## Prerequisites

- Docker installed on your machine ([Download Docker Desktop](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (comes with Docker Desktop)
- Your Supabase credentials
- Mobile device and computer on the same WiFi network

## Step 1: Configure Environment Variables

1. Navigate to the backend directory:
```bash
cd WorkerConnect-2/backend
```

2. Create a `.env` file with your Supabase credentials:
```bash
# Copy the example (if you have one)
cp env.example.txt .env
```

3. Edit the `.env` file with your actual credentials:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration (Allow all origins for mobile app)
FRONTEND_URL=*
```

⚠️ **Important**: Set `FRONTEND_URL=*` to allow your mobile app to access the API from any origin.

## Step 2: Build and Run Docker Container

### Option A: Using Docker Compose (Recommended)

1. Build and start the container:
```bash
docker-compose up -d --build
```

2. Check if the container is running:
```bash
docker-compose ps
```

3. View logs:
```bash
docker-compose logs -f
```

4. Stop the container:
```bash
docker-compose down
```

### Option B: Using Docker CLI

1. Build the Docker image:
```bash
docker build -t workerconnect-backend .
```

2. Run the container:
```bash
docker run -d \
  --name workerconnect-backend \
  -p 3001:3001 \
  --env-file .env \
  workerconnect-backend
```

3. Check if the container is running:
```bash
docker ps
```

4. View logs:
```bash
docker logs -f workerconnect-backend
```

5. Stop the container:
```bash
docker stop workerconnect-backend
docker rm workerconnect-backend
```

## Step 3: Find Your Local IP Address

### On Windows:
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

### On macOS/Linux:
```bash
ifconfig
```
or
```bash
ip addr show
```
Look for your local IP address (usually starts with 192.168.x.x or 10.0.x.x)

### Quick Method (Windows):
```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi*).IPAddress
```

Example IP: `192.168.1.100`

## Step 4: Test the Connection

1. From your computer, test the API:
```bash
curl http://localhost:3001/health
```

2. Test via IP address (replace with your IP):
```bash
curl http://192.168.1.100:3001/health
```

3. From your browser, visit:
- `http://localhost:3001`
- `http://YOUR_LOCAL_IP:3001`

You should see a JSON response with the API information.

## Step 5: Configure Your Mobile App

Update your mobile app's API configuration to use your local IP address:

### Example Configuration File
If you have an API configuration file in your mobile app (e.g., `src/api/api.ts`), update it:

```typescript
// Before (localhost)
const API_BASE_URL = 'http://localhost:3001/api';

// After (your local IP)
const API_BASE_URL = 'http://192.168.1.100:3001/api';
```

### Environment-Based Configuration (Recommended)
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-api.com/api'
  : 'http://192.168.1.100:3001/api'; // Your local IP
```

## Step 6: Allow Firewall Access (If Needed)

### Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter port "3001" → Next
6. Select "Allow the connection" → Next
7. Select all profiles → Next
8. Name it "WorkerConnect Backend" → Finish

### macOS Firewall:
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Docker to the allowed applications list

### Linux (UFW):
```bash
sudo ufw allow 3001/tcp
```

## Troubleshooting

### Cannot Connect from Mobile App

1. **Check Network**: Ensure your mobile device and computer are on the same WiFi network
2. **Check Firewall**: Make sure port 3001 is allowed through your firewall
3. **Check Container**: Verify the Docker container is running:
   ```bash
   docker-compose ps
   ```
4. **Check Logs**: Look for errors in the container logs:
   ```bash
   docker-compose logs
   ```
5. **Test Connectivity**: Ping your computer from your mobile device
6. **Check IP Address**: Ensure you're using the correct local IP address

### CORS Errors

Make sure `FRONTEND_URL=*` is set in your `.env` file and restart the container:
```bash
docker-compose down
docker-compose up -d
```

### Database Connection Errors

Check your Supabase credentials:
1. Go to Supabase Dashboard → Settings → API
2. Verify your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY`
3. Ensure your Supabase project is not paused

### Port Already in Use

If port 3001 is already in use, change it in your `.env` file:
```env
PORT=3002
```

And update the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3002:3002"
```

## Useful Docker Commands

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f workerconnect-backend
```

### Restart Container
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose up -d --build
```

### Execute Commands in Container
```bash
docker-compose exec workerconnect-backend sh
```

### Remove Container and Images
```bash
docker-compose down --rmi all
```

## Production Deployment

For production deployment, consider:

1. **Use a Reverse Proxy**: Set up Nginx or Traefik for HTTPS
2. **SSL Certificates**: Use Let's Encrypt for SSL/TLS
3. **Environment Variables**: Use Docker secrets or environment variable management
4. **Monitoring**: Add logging and monitoring solutions
5. **Backup**: Regular database backups
6. **Security**: Restrict CORS to specific origins instead of `*`

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify network connectivity
3. Ensure all environment variables are set correctly
4. Check the backend README.md for API documentation

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start container in background |
| `docker-compose down` | Stop and remove container |
| `docker-compose logs -f` | View live logs |
| `docker-compose ps` | List running containers |
| `docker-compose restart` | Restart container |
| `docker-compose up -d --build` | Rebuild and start |

---

**Your Backend URL for Mobile App**: `http://YOUR_LOCAL_IP:3001/api`

Example: `http://192.168.1.100:3001/api`

