#!/usr/bin/env bash

set -e #exits immediately if a cmd fails

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)" #deteremines project root directory
cd "$PROJECT_ROOT" #then move into the  project root

mkdir -p storage #this creates a storage directory if it doesn't already exists

sudo systemctl start mysql #this ensures the database is running before the backend starts 

BACKEND_PORT=8000 #the port the php backend will be running on 

BACKEND_LOG=storage/backend.log #a file to store backend logs 

if ! lsof -ti TCP:$BACKEND_PORT >/dev/null; then  #checks to see if anything is running on port 8000
       php -S 0.0.0.0:$BACKEND_PORT -t backend/public > $BACKEND_LOG 2>&1 & #starts php, specify host+port then logs file
fi        

FRONTEND_PORT=5173 #this is a port the frontend will run on 

FRONTEND_LOG=storage/frontend.log #a file to store/log frontend files

if ! lsof -ti TCP:$FRONTEND_PORT >/dev/null; then
	php -S 0.0.0.0:$FRONTEND_PORT -t frontend > $FRONTEND_LOG 2>&1 &
fi 

VM_IP=$(hostname -I | awk '{print $1}') # gets the vm ip address

echo "Frontend: http://$VM_IP:$FRONTEND_PORT"
echo "Backend: http://$VM_IP:$BACKEND_PORT" #prints the accessible urls



xdg-open http://$VM_IP:$FRONTEND_PORT >/dev/null 2>&1
xdg-open http://$VM_IP:$BACKEND_PORT >/dev/null 2>&1  #opens frontend and backend automatically


echo "Logs"
echo " storage/frontend.log"
echo " storage/backend.log"
