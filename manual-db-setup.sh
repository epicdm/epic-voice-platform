#!/bin/bash
set -e

# Prompt for database details
read -p "Enter Database Name: " DB_NAME
read -p "Enter Database User: " DB_USER
read -s -p "Enter Password for $DB_USER: " DB_PASS
echo

echo "--- Setting up PostgreSQL ---"

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
else
    echo "PostgreSQL is already installed."
fi

# Ensure PostgreSQL service is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL service..."
    sudo systemctl start postgresql
fi

echo "--- Creating Database and User ---"

# Execute SQL commands
sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\";" || echo "Database \"$DB_NAME\" already exists."
sudo -u postgres psql -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';" || echo "User \"$DB_USER\" already exists."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"

echo "--- Verifying Setup ---"
sudo -u postgres psql -l | grep "$DB_NAME"
sudo -u postgres psql -c "\du" | grep "$DB_USER"

echo "✅ Database '$DB_NAME' and user '$DB_USER' setup complete."
