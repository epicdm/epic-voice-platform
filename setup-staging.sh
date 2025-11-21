#!/bin/bash
set -e  # Exit on error

# STAGING Configuration
REPO_URL="https://github.com/epicdm/livekit1.git"
BRANCH="R1"  # Staging branch
APP_DIR="/opt/livekit-staging"
DOMAIN="staging.ai.epic.dm"
DB_NAME="epic_voice_staging"
DB_USER="epic_staging_user"
DB_PASS="strong_staging_password"  # CHANGE THIS

# ... rest of the original setup-prod.sh script content ...
# (Copy the entire content of setup-prod.sh but use the above variables)
