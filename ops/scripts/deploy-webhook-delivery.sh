#!/bin/bash
# Webhook Delivery Worker - Production Deployment Script
# Automates deployment of webhook delivery worker to production

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/opt/livekit1"
SYSTEMD_DIR="/etc/systemd/system"
CONFIG_DIR="/opt/livekit1/ops/config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Webhook Delivery Worker - Deployment"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "   Use: sudo $0"
    exit 1
fi

# Step 1: Verify prerequisites
echo -e "${BLUE}🔍 Step 1: Verifying prerequisites...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python 3: $(python3 --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found - skipping database check${NC}"
else
    echo -e "${GREEN}✓${NC} PostgreSQL client available"
fi

# Check Python packages
if ! python3 -c "import sqlalchemy, requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Missing Python packages${NC}"
    echo "   Install with: pip install sqlalchemy psycopg2-binary requests"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Required Python packages installed"
fi

echo ""

# Step 2: Database schema
echo -e "${BLUE}🗄️  Step 2: Checking database schema...${NC}"

SCHEMA_FILE="$PROJECT_ROOT/backend/webhook_worker/DATABASE_SCHEMA.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

echo "   Schema file: $SCHEMA_FILE"
read -p "   Deploy database schema now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$CONFIG_DIR/webhook-delivery.env" ]; then
        source "$CONFIG_DIR/webhook-delivery.env"
        # Extract password from DATABASE_URL
        DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

        echo "   Deploying to database: $DB_NAME"
        PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"
        echo -e "${GREEN}✓${NC} Database schema deployed"
    else
        echo -e "${YELLOW}⚠️  Config file not found - skipping${NC}"
    fi
else
    echo "   Skipped (run manually if needed)"
fi

echo ""

# Step 3: Configuration
echo -e "${BLUE}⚙️  Step 3: Configuring environment...${NC}"

CONFIG_FILE="$CONFIG_DIR/webhook-delivery.env"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Configuration file not found${NC}"
    echo "   Creating from template..."
    mkdir -p "$CONFIG_DIR"
    cp "$PROJECT_ROOT/backend/webhook_worker/systemd/webhook-worker.env.example" "$CONFIG_FILE"
    echo -e "${GREEN}✓${NC} Created: $CONFIG_FILE"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit $CONFIG_FILE before continuing${NC}"
    echo "   Required changes:"
    echo "   - Set DATABASE_URL"
    echo "   - Generate WEBHOOK_SECRET_ENCRYPTION_KEY"
    echo ""
    read -p "   Press Enter when configuration is complete..."
else
    echo -e "${GREEN}✓${NC} Configuration exists: $CONFIG_FILE"
fi

# Secure configuration file
chown root:www-data "$CONFIG_FILE"
chmod 640 "$CONFIG_FILE"
echo -e "${GREEN}✓${NC} Configuration permissions secured (640 root:www-data)"

echo ""

# Step 4: Systemd units
echo -e "${BLUE}🔧 Step 4: Installing systemd units...${NC}"

# Copy service files
cp "$PROJECT_ROOT/ops/systemd/webhook-delivery.service" "$SYSTEMD_DIR/webhook-delivery@.service"
cp "$PROJECT_ROOT/ops/systemd/webhook-delivery.target" "$SYSTEMD_DIR/"
echo -e "${GREEN}✓${NC} Systemd units installed"

# Reload systemd
systemctl daemon-reload
echo -e "${GREEN}✓${NC} Systemd reloaded"

echo ""

# Step 5: Enable services
echo -e "${BLUE}🚀 Step 5: Enabling services...${NC}"

systemctl enable webhook-delivery.target
echo -e "${GREEN}✓${NC} webhook-delivery.target enabled"

# Enable individual worker instances
for i in 1 2 3; do
    systemctl enable webhook-delivery@$i.service
    echo -e "${GREEN}✓${NC} webhook-delivery@$i.service enabled"
done

echo ""

# Step 6: Start services
echo -e "${BLUE}▶️  Step 6: Starting services...${NC}"

read -p "Start webhook delivery workers now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    systemctl start webhook-delivery.target
    sleep 2

    # Check status
    echo ""
    echo "Worker Status:"
    systemctl status webhook-delivery.target --no-pager | head -20

    echo ""
    echo "Individual Workers:"
    for i in 1 2 3; do
        if systemctl is-active --quiet webhook-delivery@$i.service; then
            echo -e "  ${GREEN}✓${NC} webhook-delivery@$i: active"
        else
            echo -e "  ${RED}✗${NC} webhook-delivery@$i: inactive"
        fi
    done
else
    echo "   Skipped (start manually with: systemctl start webhook-delivery.target)"
fi

echo ""

# Step 7: Verification
echo -e "${BLUE}✅ Step 7: Verification${NC}"

echo ""
echo "Deployment Commands:"
echo "  View logs:     journalctl -u 'webhook-delivery@*' -f"
echo "  Check status:  systemctl status webhook-delivery.target"
echo "  Restart:       systemctl restart webhook-delivery.target"
echo "  Stop:          systemctl stop webhook-delivery.target"
echo ""
echo "Monitoring:"
echo "  Queue status:  python3 $PROJECT_ROOT/backend/webhook_worker/queue_monitor.py"
echo "  Watch queue:   python3 $PROJECT_ROOT/backend/webhook_worker/queue_monitor.py --watch"
echo ""

# Final status check
if systemctl is-active --quiet webhook-delivery.target; then
    echo -e "${GREEN}=========================================="
    echo "✅ Deployment Complete!"
    echo "==========================================\${NC}"
    echo ""
    echo "Workers are running. Monitor logs with:"
    echo "  journalctl -u 'webhook-delivery@*' -f"
else
    echo -e "${YELLOW}=========================================="
    echo "⚠️  Deployment Complete (Workers Not Started)"
    echo "==========================================\${NC}"
    echo ""
    echo "Start workers with:"
    echo "  systemctl start webhook-delivery.target"
fi

exit 0
