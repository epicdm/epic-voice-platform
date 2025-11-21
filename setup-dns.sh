#!/bin/bash
set -e

# Usage: ./setup-dns.sh <domain> <ip> [provider]
# Example: ./setup-dns.sh ai.epic.dm 1.2.3.4 digitalocean

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <domain> <ip> [provider]"
    exit 1
fi

DOMAIN="$1"
IP="$2"
PROVIDER="${3:-digitalocean}"

if [ "$PROVIDER" == "digitalocean" ]; then
    # Check for doctl
    if ! command -v doctl &> /dev/null; then
        echo "doctl not found. Please install it: https://github.com/digitalocean/doctl"
        exit 1
    fi

    # Check if domain exists in DigitalOcean
    if doctl compute domain list | grep -q "$DOMAIN"; then
        echo "Domain $DOMAIN found in DigitalOcean"
    else
        echo "Domain $DOMAIN not found. Please add it in the DigitalOcean control panel."
        exit 1
    fi

    # Create A record
    echo "Creating A record for $DOMAIN -> $IP"
    doctl compute domain records create $DOMAIN \
        --record-type A \
        --record-name @ \
        --record-data $IP \
        --record-ttl 3600

    echo "✅ DNS record created"
else
    echo "Provider $PROVIDER not supported"
    exit 1
fi
