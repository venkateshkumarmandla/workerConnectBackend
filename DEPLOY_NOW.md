# 🚀 Deploy Backend to Docker - Step by Step

## Your Configuration
- **Your IP Address**: `192.168.129.46`
- **Backend URL**: `http://192.168.129.46:3001/api`
- **Mobile App Config**: ✅ Already updated

---

## ⚠️ IMPORTANT: Get Supabase Service Key

Before deploying, you need to get your **service_role** key:

1. Go to: https://supabase.com/dashboard/project/jtseaglabuxnhowafnnm/settings/api
2. Find the **`service_role`** key (NOT the anon key)
3. Copy it (it's a long JWT token starting with `eyJ...`)

---

## 🔧 Step 1: Create .env File

**Option A: Using PowerShell**
```powershell
cd backend

# Copy the configured file to .env
Copy-Item env.configured.txt .env

# Now edit .env and replace YOUR_SERVICE_ROLE_KEY_HERE with actual key
notepad .env
```

**Option B: Manual**
1. Navigate to `backend` folder
2. Copy `env.configured.txt` to `.env`
3. Open `.env` in text editor
4. Replace `SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE` with your actual service_role key
5. Verify `FRONTEND_URL=*` is set
6. Save the file

Your `.env` should look like:
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://jtseaglabuxnhowafnnm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # <-- Replace this
JWT_SECRET=workerconnect-secret-key-2024-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=*
```

---

## 🐳 Step 2: Deploy to Docker

```powershell
# Navigate to backend folder
cd backend

# Build and start the Docker container
docker-compose up -d --build
```

Wait for the build to complete (first time may take 2-3 minutes).

---

## ✅ Step 3: Verify Deployment

```powershell
# Check if container is running
docker-compose ps

# View logs
docker-compose logs

# Test health endpoint
curl http://localhost:3001/health
curl http://192.168.129.46:3001/health
```

You should see a JSON response like:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-11-04T..."
}
```

---

## 📱 Step 4: Test from Mobile Device

1. Open your mobile browser
2. Visit: `http://192.168.129.46:3001/health`
3. You should see the health check response

---

## 🔥 Step 5: Allow Firewall (If Needed)

**Windows PowerShell (Run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "WorkerConnect Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Or manually:**
1. Windows Security → Firewall & network protection
2. Advanced settings → Inbound Rules → New Rule
3. Port → TCP → 3001 → Allow the connection

---

## 📲 Step 6: Rebuild Mobile App

```powershell
# From project root
npm run build
npx cap sync android
```

Then open Android Studio and rebuild the app.

---

## 🐛 Troubleshooting

### Container won't start?
```powershell
cd backend
docker-compose logs
```

### Can't connect from mobile?
1. Check both devices on same WiFi
2. Check firewall allows port 3001
3. Verify IP hasn't changed: `ipconfig`

### Database connection error?
- Verify SUPABASE_SERVICE_KEY is correct
- Check Supabase project is not paused

### Update code and redeploy:
```powershell
cd backend
docker-compose down
docker-compose up -d --build
```

---

## 🎯 Quick Commands

| Task | Command |
|------|---------|
| Start backend | `docker-compose up -d` |
| Stop backend | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Restart | `docker-compose restart` |
| Rebuild | `docker-compose up -d --build` |

---

## ✅ Checklist

- [ ] Got Supabase service_role key
- [ ] Created `.env` file with service_role key
- [ ] Verified `FRONTEND_URL=*` in `.env`
- [ ] Ran `docker-compose up -d --build`
- [ ] Container is running (`docker-compose ps`)
- [ ] Health check works (`curl http://192.168.129.46:3001/health`)
- [ ] Firewall allows port 3001
- [ ] Can access from mobile browser
- [ ] Mobile app rebuilt with new config

---

**Your Backend URL**: `http://192.168.129.46:3001/api`

**Ready to deploy!** 🚀

