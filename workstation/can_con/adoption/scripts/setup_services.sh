#!/bin/bash
USER=$(whoami)
HOME_DIR=$(eval echo ~$USER)
BACKEND_DIR="$HOME_DIR/Capstone-Group-01/workstation/can_con/adoption/backend"
DATABASE_DIR="$HOME_DIR/Capstone-Group-01/workstation/database"
HOSTNAME=$(hostname)

echo "[setup] Installing systemd services for $USER on $HOSTNAME"

if [ -f "$BACKEND_DIR/frontend.php" ]; then
    sudo tee /etc/systemd/system/canine-frontend.service > /dev/null << EOF
[Unit]
Description=Canine Connections Frontend Worker
After=network.target
[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/php frontend.php
Restart=always
RestartSec=5
StandardOutput=append:/var/log/canine-frontend.log
StandardError=append:/var/log/canine-frontend.log
[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable canine-frontend
    sudo systemctl restart canine-frontend
    echo "[setup] canine-frontend installed and started"
fi

if [ -f "$BACKEND_DIR/dbridge.php" ]; then
    sudo tee /etc/systemd/system/canine-dbridge.service > /dev/null << EOF
[Unit]
Description=Canine Connections DBridge Worker
After=network.target
[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/php dbridge.php
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable canine-dbridge
    sudo systemctl restart canine-dbridge
    echo "[setup] canine-dbridge installed and started"
fi

if [ -f "$DATABASE_DIR/db_worker.php" ]; then
    sudo tee /etc/systemd/system/canine-db-worker.service > /dev/null << EOF
[Unit]
Description=Canine Connections DB Worker
After=network.target mysql.service
Wants=mysql.service
[Service]
Type=simple
User=$USER
WorkingDirectory=$DATABASE_DIR
ExecStart=/usr/bin/php db_worker.php
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable canine-db-worker
    sudo systemctl restart canine-db-worker
    echo "[setup] canine-db-worker installed and started"
fi

echo "[setup] Done. Services active on $HOSTNAME:"
sudo systemctl status canine-frontend canine-dbridge canine-db-worker --no-pager 2>/dev/null | grep -E "Active|canine"
