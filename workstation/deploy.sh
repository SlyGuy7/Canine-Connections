#!/bin/bash

LB_IP="100.99.21.39"
NODE1_IP="100.89.110.16"
NODE2_IP="100.80.193.50"
DEPLOY_DATA="deploy.json"

echo "Starting Automated Zero Downtime Deployment..."
git checkout deploy.json
git pull origin main
npm install
npm run build

ACTIVE_NODE=$(awk -F'"' '/active_node/ {print $4}' $DEPLOY_DATA)
echo "Current Active Node: $ACTIVE_NODE"

if [ "$ACTIVE_NODE" == "node1" ]; then
echo "Draining traffic from Node 2..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE2_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

echo "Updating Node 2..."
scp -i ~/.ssh/id_ed25519 -r dist/. deryk@$NODE2_IP:/var/www/html/

echo "Switching traffic to Node 2..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE2_IP/s/^#//' /etc/nginx/nginx.conf && sudo sed -i '/$NODE1_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

echo "Updating Node 1..."
sudo cp -r dist/. /var/www/html/

echo "Enabling both nodes..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE2_IP/s/^#//' /etc/nginx/nginx.conf && sudo nginx -s reload"

sed -i 's/node1/node2/g' $DEPLOY_DATA
else
echo "Draining traffic from Node 1..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE1_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

echo "Updating Node 1..."
sudo cp -r dist/. /var/www/html/

echo "Switching traffic to Node 1..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE1_IP/s/^#//' /etc/nginx/nginx.conf && sudo sed -i '/$NODE2_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

echo "Updating Node 2..."
scp -i ~/.ssh/id_ed25519 -r dist/. deryk@$NODE2_IP:/var/www/html/

echo "Enabling both nodes..."
ssh -i ~/.ssh/id_ed25519 deryk@$LB_IP "sudo sed -i '/$NODE2_IP/s/^#//' /etc/nginx/nginx.conf && sudo nginx -s reload"

sed -i 's/node2/node1/g' $DEPLOY_DATA
fi

echo "Deployment Complete."