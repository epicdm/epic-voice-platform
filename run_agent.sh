#!/bin/bash

# LiveKit Multi-Tenant Agent Runner
# This script runs the SIP-enabled voice agent that routes calls based on phone numbers

echo "🤖 Starting LiveKit Multi-Tenant Voice Agent"
echo "============================================="
echo ""
echo "Agent will:"
echo "  • Listen for incoming SIP calls"
echo "  • Look up agent config by phone number"
echo "  • Use database-configured instructions"
echo "  • Log all calls to database"
echo ""
echo "Press Ctrl+C to stop the agent"
echo "============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys"
    exit 1
fi

# Check if virtual environment is set up
if [ ! -d .venv ]; then
    echo "📦 Setting up virtual environment..."
    uv sync
fi

# Run the agent in development mode
echo "🚀 Starting agent..."
uv run python multi_tenant_agent.py dev
