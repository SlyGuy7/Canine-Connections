#!/bin/bash

echo "Starting Deployment..."

# Step 1: Get the latest code
echo "Pulling latest code from GitHub..."
git pull origin main

# Step 2: Build the React project
echo "Building production assets..."
npm install
npm run build

# Step 3: Deploy to Node 1
echo "Deploying to Node 1..."
sudo cp -r dist/* /var/www/html/

# Step 4: Deploy to Node 2
echo "Sending files to Node 2..."
# Removed brackets from IP as scp does not require them for standard IPv4
scp -r dist/* vmware@100.80.193.50:/var/www/html/

echo "Deployment Complete! Both nodes are running the latest code."