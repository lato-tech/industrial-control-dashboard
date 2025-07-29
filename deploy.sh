#!/bin/bash

# Industrial Control Dashboard Deployment Script
# For Raspberry Pi 5

echo "🚀 Starting Industrial Control Dashboard Deployment..."

# Set project directory
PROJECT_DIR="/home/pi/industrial-control-dashboard"
REPO_URL="https://github.com/lato-tech/industrial-control-dashboard.git"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Project directory not found. Cloning repository..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
else
    echo "📁 Project directory found. Updating from repository..."
    cd $PROJECT_DIR
    git pull origin main
fi

# Install/update dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Navigate to Python directory
cd Python

# Check if application is running
if pgrep -f "python3 main.py" > /dev/null; then
    echo "🛑 Stopping existing application..."
    pkill -f "python3 main.py"
    sleep 2
fi

# Start the application
echo "🚀 Starting Industrial Control Dashboard..."
python3 main.py 