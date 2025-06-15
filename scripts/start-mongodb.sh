#!/bin/bash

# Create MongoDB data directory
mkdir -p /tmp/mongodb-data

# Kill any existing MongoDB processes
pkill -f mongod 2>/dev/null || true

# Start MongoDB
mongod --dbpath /tmp/mongodb-data --port 27017 --bind_ip 127.0.0.1 --nojournal --logpath /tmp/mongodb.log --fork --quiet

# Wait for MongoDB to start
sleep 3

# Check if MongoDB is running
if pgrep -f mongod > /dev/null; then
    echo "MongoDB started successfully"
else
    echo "Failed to start MongoDB"
    exit 1
fi