#!/bin/bash
set -e  # Exit on error

# PRODUCTION Configuration
REPO_URL="https://github.com/epicdm/livekit1.git"
BRANCH="main"  # Production branch
APP_DIR="/opt/livekit-prod"
DOMAIN="prod.ai.epic.dm"
DB_NAME="epic_voice_prod"
DB_USER="epic_prod_user"
DB_PASS="strong_prod_password"  # CHANGE THIS

# Install dependencies
echo "========================================"
echo "INSTALLING SYSTEM DEPENDENCIES"
echo "========================================"
sudo apt update
sudo apt install -y git nodejs npm python3-pip postgresql postgresql-contrib apache2 certbot python3-certbot-apache
echo "✅ Dependencies installed"

# GitHub repository operations
echo "========================================"
echo "SETTING UP GITHUB REPOSITORY"
echo "========================================"
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo "Target directory: $APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
    echo "Existing repository found - updating code..."
    cd $APP_DIR
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
else
    echo "Cloning new repository..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    git checkout $BRANCH
fi

echo "✅ Repository setup complete"
echo "Current commit: $(git rev-parse --short HEAD)"
echo

# Install frontend dependencies
echo "========================================"
echo "INSTALLING FRONTEND DEPENDENCIES"
echo "========================================"
cd $APP_DIR/frontend
npm ci --production
npx prisma generate
echo "✅ Frontend dependencies installed"

# Install backend dependencies
echo "========================================"
echo "INSTALLING BACKEND DEPENDENCIES"
echo "========================================"
cd $APP_DIR
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Database setup
echo "========================================"
echo "CONFIGURING DATABASE"
echo "========================================"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "✅ Database configured"

# Apply database migrations
echo "========================================"
echo "APPLYING DATABASE MIGRATIONS"
echo "========================================"
cd $APP_DIR/frontend
npx prisma migrate deploy
echo "✅ Migrations applied"

# Configure environment files
echo "========================================"
echo "SETTING UP ENVIRONMENT FILES"
echo "========================================"
cp $APP_DIR/frontend/.env.example $APP_DIR/frontend/.env.local
cp $APP_DIR/.env.example $APP_DIR/.env
echo "✅ Environment files configured"

# Configure Apache
echo "========================================"
echo "CONFIGURING APACHE WEB SERVER"
echo "========================================"
sudo tee /etc/apache2/sites-available/$DOMAIN.conf > /dev/null <<EOL
<VirtualHost *:80>
    ServerName $DOMAIN
    DocumentRoot $APP_DIR/frontend/.next
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    ProxyPass /api http://localhost:5000/
    ProxyPassReverse /api http://localhost:5000/
    
    ErrorLog \${APACHE_LOG_DIR}/${DOMAIN}_error.log
    CustomLog \${APACHE_LOG_DIR}/${DOMAIN}_access.log combined
</VirtualHost>
EOL

sudo a2ensite $DOMAIN
sudo a2enmod proxy proxy_http
sudo systemctl reload apache2
echo "✅ Apache configured"

# SSL certificate setup
echo "========================================"
echo "SETTING UP SSL CERTIFICATE"
echo "========================================"
sudo certbot --apache -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
echo "✅ SSL certificate installed"

# Systemd services setup
echo "========================================"
echo "CONFIGURING SYSTEM SERVICES"
echo "========================================"

# Frontend service (Next.js)
sudo tee /etc/systemd/system/livekit-frontend.service > /dev/null <<EOL
[Unit]
Description=LiveKit Voice Agent Dashboard Frontend
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR/frontend
ExecStart=npm run start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOL

# Backend service (Flask)
sudo tee /etc/systemd/system/livekit-backend.service > /dev/null <<EOL
[Unit]
Description=LiveKit Voice Agent Backend
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 user_dashboard:app
Restart=always
Environment=FLASK_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable livekit-frontend
sudo systemctl enable livekit-backend
sudo systemctl start livekit-frontend
sudo systemctl start livekit-backend
echo "✅ Services started"

# Final checks
echo "========================================"
echo "VERIFYING INSTALLATION"
echo "========================================"
echo "Frontend status:"
sudo systemctl status livekit-frontend --no-pager | head -10
echo -e "\nBackend status:"
sudo systemctl status livekit-backend --no-pager | head -10

echo -e "\nTesting HTTPS connection:"
curl -I https://$DOMAIN

echo "========================================"
echo "✅ PRODUCTION SETUP COMPLETE"
echo "========================================"
echo "Application URL: https://$DOMAIN"
echo "Frontend running on: http://localhost:3000"
echo "Backend running on: http://localhost:5000"
