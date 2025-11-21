# LiveKit Agent Management Dashboard

A web-based interface for managing your LiveKit voice agent on a headless server.

## Features

✅ **Agent Control**
- Start/Stop/Restart agent with one click
- Real-time status monitoring (CPU, Memory, Uptime)
- Process management

✅ **Configuration Management**
- Edit all environment variables through web UI
- LiveKit settings (URL, API keys)
- AI provider settings (OpenAI, Deepgram)
- Voice and language settings
- SIP trunk configuration

✅ **SIP Information**
- View inbound SIP trunks
- Monitor dispatch rules
- Track phone numbers

✅ **Real-time Monitoring**
- Agent process status
- Performance metrics
- System resource usage

## Quick Start

### Start the Dashboard

```bash
cd /opt/livekit1
uv run python admin_dashboard.py
```

The dashboard will be available at: **http://your-server-ip:5000**

### Set Up as System Service (Optional)

To run the dashboard as a background service that starts automatically on boot:

```bash
# Copy service file
sudo cp livekit-dashboard.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable livekit-dashboard
sudo systemctl start livekit-dashboard

# Check status
sudo systemctl status livekit-dashboard
```

### View logs

```bash
sudo journalctl -u livekit-dashboard -f
```

## Accessing the Dashboard

### Local Network Access
Open your browser and navigate to:
```
http://your-server-ip:5000
```

### Secure Remote Access (Recommended)

For production use, secure the dashboard with:

#### 1. SSH Tunnel
```bash
ssh -L 5000:localhost:5000 user@your-server-ip
```
Then access via `http://localhost:5000`

#### 2. Nginx Reverse Proxy with SSL

Install Nginx and Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

Create Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d your-domain.com
```

#### 3. Add Basic Authentication

Install apache2-utils:
```bash
sudo apt install apache2-utils
```

Create password file:
```bash
htpasswd -c /opt/livekit1/.htpasswd admin
```

Update `admin_dashboard.py` to add Flask-HTTPAuth (see Flask docs).

## Dashboard Sections

### 🟢 Agent Status
- **Running/Stopped indicator**: Real-time status with pulsing animation
- **Process metrics**: PID, CPU usage, Memory consumption, Uptime
- **Control buttons**: Start, Stop, and Restart agent

### ⚙️ Configuration
Edit all settings:
- **LiveKit**: URL, API keys, agent name
- **AI Providers**: OpenAI and Deepgram API keys
- **Models**: LLM selection (GPT-4o, GPT-4o-mini, etc.)
- **Voice**: Choose from 6 OpenAI voices
- **Language & Temperature**: Customize behavior
- **SIP**: Trunk ID configuration

### 📞 SIP Information
View your telephony setup:
- Inbound trunk details and phone numbers
- Dispatch rules and routing configuration

### 📋 Logs
Real-time agent logs display (future feature - currently shows placeholder)

## Security Considerations

⚠️ **Important**: This dashboard runs without authentication by default.

For production deployment:
1. ✅ Use SSH tunneling or VPN for access
2. ✅ Set up Nginx reverse proxy with SSL
3. ✅ Add HTTP Basic Authentication
4. ✅ Use a firewall to restrict access (only allow specific IPs)
5. ✅ Change default port from 5000

Example firewall rules:
```bash
# Allow only specific IP
sudo ufw allow from YOUR_IP_ADDRESS to any port 5000

# Or use SSH tunnel only
sudo ufw deny 5000
```

## Troubleshooting

### Dashboard won't start
```bash
# Check if port 5000 is already in use
sudo lsof -i :5000

# Check logs
uv run python admin_dashboard.py
```

### Can't connect to dashboard
```bash
# Verify dashboard is running
ps aux | grep admin_dashboard

# Check firewall
sudo ufw status

# Test local access
curl http://localhost:5000
```

### Agent controls not working
```bash
# Ensure uv is installed and in PATH
which uv

# Check agent script exists
ls -la /opt/livekit1/livekit_basic_agent.py

# Test manual start
cd /opt/livekit1
uv run python livekit_basic_agent.py dev
```

## API Endpoints

The dashboard exposes these REST API endpoints:

- `GET /` - Dashboard UI
- `GET /api/status` - Get agent status
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent
- `POST /api/agent/restart` - Restart agent
- `GET /api/sip` - Get SIP information

You can integrate these with your own automation tools or scripts.

## Next Steps

1. **Secure the dashboard** with authentication
2. **Set up SSL** with Let's Encrypt
3. **Add monitoring alerts** for agent downtime
4. **Create backups** of your configuration
5. **Integrate with monitoring** tools like Grafana

## Support

For issues or questions:
- Check the main README.md
- Review LiveKit documentation: https://docs.livekit.io/
- Check agent logs for errors

---

Built with ❤️ using Flask, TailwindCSS, and LiveKit
