#!/bin/bash

# Usage: ./setup-db.sh <environment>
# Example: ./setup-db.sh prod

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

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
DB_NAME=$(parse_ini $ENVIRONMENT DB_NAME)
DB_USER=$(parse_ini $ENVIRONMENT DB_USER)

read -s -p "Enter database password for $DB_USER: " DB_PASS
echo

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    sudo systemctl start postgresql
fi

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || echo "Database $DB_NAME already exists"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || echo "User $DB_USER already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo "✅ Database setup complete"
