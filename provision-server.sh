#!/bin/bash
set -e

# Usage: ./provision-server.sh <provider> <environment>
# Example: ./provision-server.sh digitalocean prod

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <provider> <environment>"
    exit 1
fi

PROVIDER="$1"
ENVIRONMENT="$2"

if [ "$PROVIDER" == "digitalocean" ]; then
    # Check for doctl installation
    if ! command -v doctl &> /dev/null; then
        echo "doctl not found. Please install it: https://github.com/digitalocean/doctl"
        exit 1
    fi

    # Configuration
    DROPLET_NAME="livekit-${ENVIRONMENT}"
    DROPLET_SIZE="s-2vcpu-4gb"
    DROPLET_IMAGE="ubuntu-22-04-x64"
    REGION="nyc3"

    # Create droplet
    echo "Creating DigitalOcean droplet: $DROPLET_NAME"
    doctl compute droplet create $DROPLET_NAME \
        --size $DROPLET_SIZE \
        --image $DROPLET_IMAGE \
        --region $REGION \
        --wait \
        --format "ID,Name,PublicIPv4" \
        --no-header

    # Get droplet IP
    DROPLET_IP=$(doctl compute droplet list --format "PublicIPv4,Name" | grep "$DROPLET_NAME" | awk '{print $1}')
    echo "Droplet IP: $DROPLET_IP"

    # Add firewall rules
    echo "Configuring firewall..."
    doctl compute firewall create \
        --name "livekit-${ENVIRONMENT}-fw" \
        --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:80,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0" \
        --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0" \
        --droplet-ids $(doctl compute droplet list $DROPLET_NAME --format ID --no-header)

    echo "✅ Server provisioned: $DROPLET_IP"

    # TODO: Automate DNS record creation if domain is managed by DigitalOcean
    echo "Please add an A record for your domain to point to $DROPLET_IP"
else
    echo "Provider $PROVIDER not supported yet"
    exit 1
fi
