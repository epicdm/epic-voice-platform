# 🚀 SystemD Services Setup Complete

## ✅ **Application Running as Services**

Both the backend and frontend are now configured as **systemd services** that:
- ✅ Start automatically on boot
- ✅ Restart automatically if they crash
- ✅ Run in the background
- ✅ Have proper logging
- ✅ Can be managed with systemctl commands

---

## 📋 **Services Created:**

### **1. Backend Service (Flask API)**
- **Name:** `livekit-backend.service`
- **Status:** ✅ Running
- **Port:** 5001
- **Log file:** `/opt/livekit1/flask.log`

### **2. Frontend Service (Next.js)**
- **Name:** `livekit-frontend.service`
- **Status:** ✅ Running
- **Port:** 3001
- **Log file:** `/opt/livekit1/frontend.log`

---

## 🔗 **Access URLs:**

### **Frontend (UI):**
```
http://66.118.37.6:3001
http://localhost:3001
```

### **Backend API:**
```
http://66.118.37.6:5001
http://localhost:5001
```

### **Splash Page:**
```
http://66.118.37.6:3001/
```

### **Dashboard:**
```
http://66.118.37.6:3001/dashboard
```

---

## 🛠️ **Service Management Commands:**

### **Check Status:**
```bash
# Backend
systemctl status livekit-backend

# Frontend
systemctl status livekit-frontend

# Both at once
systemctl status livekit-*
```

### **Start/Stop/Restart:**
```bash
# Backend
systemctl start livekit-backend
systemctl stop livekit-backend
systemctl restart livekit-backend

# Frontend
systemctl start livekit-frontend
systemctl stop livekit-frontend
systemctl restart livekit-frontend

# Both
systemctl restart livekit-*
```

### **View Logs:**
```bash
# Backend logs (Flask)
tail -f /opt/livekit1/flask.log
journalctl -u livekit-backend -f

# Frontend logs (Next.js)
tail -f /opt/livekit1/frontend.log
journalctl -u livekit-frontend -f
```

### **Enable/Disable Auto-start:**
```bash
# Enable (auto-start on boot) - Already enabled
systemctl enable livekit-backend
systemctl enable livekit-frontend

# Disable (don't auto-start on boot)
systemctl disable livekit-backend
systemctl disable livekit-frontend
```

---

## 📁 **Service Configuration Files:**

### **Backend Service File:**
```
/etc/systemd/system/livekit-backend.service
```

### **Frontend Service File:**
```
/etc/systemd/system/livekit-frontend.service
```

### **To Edit Service Files:**
```bash
# Edit backend
nano /etc/systemd/system/livekit-backend.service

# Edit frontend
nano /etc/systemd/system/livekit-frontend.service

# After editing, reload and restart:
systemctl daemon-reload
systemctl restart livekit-backend
systemctl restart livekit-frontend
```

---

## 🔧 **Service Configurations:**

### **Backend Service (livekit-backend.service):**
```ini
[Unit]
Description=LiveKit Voice Agent Dashboard Backend (Flask)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/livekit1
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 /opt/livekit1/user_dashboard.py
Restart=always
RestartSec=10
StandardOutput=append:/opt/livekit1/flask.log
StandardError=append:/opt/livekit1/flask.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### **Frontend Service (livekit-frontend.service):**
```ini
[Unit]
Description=LiveKit Voice Agent Dashboard Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/livekit1/frontend
Environment="PATH=/root/.nvm/versions/node/v22.17.0/bin:/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="NEXT_PUBLIC_API_URL=http://localhost:5001"
ExecStartPre=/bin/bash -c 'cd /opt/livekit1/frontend && npm install 2>&1 | tail -5'
ExecStart=/bin/bash -c 'cd /opt/livekit1/frontend && npm run start'
Restart=always
RestartSec=10
StandardOutput=append:/opt/livekit1/frontend.log
StandardError=append:/opt/livekit1/frontend.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

---

## 📊 **Current Status:**

```bash
● livekit-backend.service - LiveKit Voice Agent Dashboard Backend (Flask)
     Loaded: loaded
     Active: active (running)
   Main PID: 3174854
      Tasks: 1
     Memory: 51.5M
        CPU: 1.616s

● livekit-frontend.service - LiveKit Voice Agent Dashboard Frontend (Next.js)
     Loaded: loaded
     Active: active (running)
   Main PID: 3182324
      Tasks: 34
     Memory: 148.3M
        CPU: 12.975s
```

---

## 🔄 **Automatic Restart:**

Both services are configured with:
```
Restart=always
RestartSec=10
```

This means:
- ✅ If they crash, they restart automatically after 10 seconds
- ✅ If the server reboots, they start automatically
- ✅ No manual intervention needed

---

## 📝 **Quick Troubleshooting:**

### **Service won't start:**
```bash
# Check status
systemctl status livekit-backend
systemctl status livekit-frontend

# Check logs
journalctl -u livekit-backend -n 50
journalctl -u livekit-frontend -n 50

# Check application logs
tail -50 /opt/livekit1/flask.log
tail -50 /opt/livekit1/frontend.log
```

### **Port already in use:**
```bash
# Check what's using the port
lsof -i :5001  # Backend
lsof -i :3001  # Frontend

# Kill the process if needed
kill -9 <PID>
```

### **Service not found:**
```bash
# Reload systemd
systemctl daemon-reload

# Re-enable service
systemctl enable livekit-backend
systemctl enable livekit-frontend
```

---

## 🎯 **Benefits of Running as Services:**

### **1. Reliability:**
- Automatic restart on failure
- Survives server reboots
- Proper process management

### **2. Monitoring:**
- Systemd tracks status
- Easy to check if running
- Centralized logs

### **3. Control:**
- Simple start/stop commands
- Graceful shutdown
- Resource limits

### **4. Production Ready:**
- Runs in background
- No terminal needed
- Proper logging

---

## 🚨 **Important Notes:**

### **Port Configuration:**
- **Backend:** Port 5001 (Flask API)
- **Frontend:** Port 3001 (Next.js UI)
- **Note:** Port 3000 is used by Grafana (n8n_grafana container)

### **Environment Variables:**
- Backend uses: `/opt/livekit1/.env`
- Frontend uses: Environment vars in service file

### **Node.js Version:**
- Frontend requires Node.js v22.17.0 (installed via nvm)
- Path is set in service file

### **Build Process:**
- Frontend is pre-built (production build)
- Build files are in `/opt/livekit1/frontend/.next`
- Rebuild if you make changes: `cd /opt/livekit1/frontend && npm run build`

---

## 🔄 **Updating the Application:**

### **After Code Changes:**

**Backend (Python):**
```bash
# Just restart - Python doesn't need rebuilding
systemctl restart livekit-backend
```

**Frontend (Next.js):**
```bash
# Need to rebuild first
cd /opt/livekit1/frontend
npm run build
systemctl restart livekit-frontend
```

---

## 📊 **Monitoring:**

### **Check if services are running:**
```bash
systemctl is-active livekit-backend
systemctl is-active livekit-frontend
```

### **Check if services are enabled (auto-start):**
```bash
systemctl is-enabled livekit-backend
systemctl is-enabled livekit-frontend
```

### **View resource usage:**
```bash
systemctl status livekit-backend livekit-frontend
```

### **Real-time logs:**
```bash
# Backend
journalctl -u livekit-backend -f

# Frontend
journalctl -u livekit-frontend -f

# Both combined
journalctl -u livekit-* -f
```

---

## ✅ **Verification:**

### **Test Backend:**
```bash
curl http://localhost:5001/api/user/agents
```

### **Test Frontend:**
```bash
curl -I http://localhost:3001
```

### **Test from Browser:**
```
http://66.118.37.6:3001
```

---

## 🎉 **Summary:**

| Component | Status | Port | Service Name | Auto-Start |
|-----------|--------|------|--------------|------------|
| **Backend (Flask)** | ✅ Running | 5001 | livekit-backend.service | ✅ Yes |
| **Frontend (Next.js)** | ✅ Running | 3001 | livekit-frontend.service | ✅ Yes |

---

## 🔗 **Quick Access:**

**Main Dashboard:**
```
http://66.118.37.6:3001/dashboard
```

**Agents Management:**
```
http://66.118.37.6:3001/agents
```

**Phone Numbers:**
```
http://66.118.37.6:3001/phone-numbers
```

**Analytics:**
```
http://66.118.37.6:3001/analytics
```

---

**Everything is now running as proper system services! 🚀**
