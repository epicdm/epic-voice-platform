#!/bin/bash
set -e

# --- Self-correction: Force script to run from its own directory ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR" || exit

echo "Running from: $(pwd)"

# Usage: ./deploy.sh <environment>
# Example: ./deploy.sh prod

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi


# Backup current installation
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/opt/livekit1-backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "Backing up current installation to $BACKUP_DIR"
rsync -a --delete /opt/livekit1/ "$BACKUP_DIR/app/" --exclude "livekit1-backups"

# Setup database
./setup-db.sh $ENVIRONMENT

# Backup database
PGPASSWORD=$DB_PASS pg_dump -h localhost -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/db_backup.sql"


# Read config file
function parse_ini() {
    local section=$1
    local key=$2
    awk -F'=' -v section="[$section]" -v key="$key" '
        $0 == section { in_section=1 }
        in_section && $1 == key { print $2; exit }
        /\[.*\]/ && in_section { exit }
    ' deploy.conf
}

# Get environment from argument
ENVIRONMENT=$1

# Set variables
DOMAIN=$(parse_ini $ENVIRONMENT DOMAIN)
BRANCH=$(parse_ini $ENVIRONMENT BRANCH)
APP_DIR=$(parse_ini $ENVIRONMENT APP_DIR)
DB_NAME=$(parse_ini $ENVIRONMENT DB_NAME)
DB_USER=$(parse_ini $ENVIRONMENT DB_USER)


read -s -p "Enter database password: " DB_PASS
echo

# Export DB_PASSWORD so that setup-unified.sh can use it
export DB_PASSWORD="$DB_PASS"

# Stop backend service
sudo systemctl stop livekit-backend

# Run the setup script
if ! sudo -E bash setup-unified.sh prod $BRANCH; then
    echo "Deployment failed. Rolling back..."
    # Restore application files
    if [ -d "$BACKUP_DIR/app" ]; then
        rm -rf /opt/livekit1
        cp -r "$BACKUP_DIR/app/livekit1" /opt/livekit1
    fi

    # Restore database
    if [ -f "$BACKUP_DIR/db_backup.sql" ]; then
        psql -U epic_user -d epic_voice_db < "$BACKUP_DIR/db_backup.sql"
    fi

    # Restart backend service
    sudo systemctl start livekit-backend

    echo "Rollback complete."
    exit 1
fi

# Start backend service
sudo systemctl start livekit-backend

if ! sudo -E bash setup-unified.sh prod $BRANCH; then
    echo "Deployment failed. Rolling back..."
    # Restore application files
    if [ -d "$BACKUP_DIR/app" ]; then
        rm -rf /opt/livekit1
        cp -r "$BACKUP_DIR/app/livekit1" /opt/livekit1
    fi

    # Restore database
    if [ -f "$BACKUP_DIR/db_backup.sql" ]; then
        psql -U epic_user -d epic_voice_db < "$BACKUP_DIR/db_backup.sql"
    fi

    echo "Rollback complete."
    exit 1
fi

sudo -E bash setup-unified.sh prod $BRANCH

echo "✅ Production deployment complete"
echo "Access your site at: https://$DOMAIN"
