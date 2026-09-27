#!/bin/bash
# Usage: ./setup_services.sh [frontend|dbridge|db]
# Run this on your own VM — it installs and enables only your service.
# No argument = install all applicable services (legacy behaviour).

ROLE=${1:-all}
USER=$(whoami)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
DATABASE_DIR="$REPO_ROOT/database"
HOSTNAME=$(hostname)

echo "[setup] Role: $ROLE | User: $USER | Host: $HOSTNAME"

# PHP dependencies are not committed — install them before starting a worker.
composer_install() {
    echo "[setup] Installing PHP dependencies in $1"
    (cd "$1" && composer install --no-interaction --no-dev --optimize-autoloader -q)
}

install_frontend() {
    if [ ! -f "$BACKEND_DIR/frontend.php" ]; then
        echo "[setup] ERROR: $BACKEND_DIR/frontend.php not found. Is the repo cloned?"
        exit 1
    fi
    composer_install "$BACKEND_DIR"
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
    echo "[setup] canine-frontend installed, enabled, and started"
}

install_dbridge() {
    if [ ! -f "$BACKEND_DIR/dbridge.php" ]; then
        echo "[setup] ERROR: $BACKEND_DIR/dbridge.php not found. Is the repo cloned?"
        exit 1
    fi
    composer_install "$BACKEND_DIR"
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
    echo "[setup] canine-dbridge installed, enabled, and started"
}

install_db() {
    if [ ! -f "$DATABASE_DIR/db_worker.php" ]; then
        echo "[setup] ERROR: $DATABASE_DIR/db_worker.php not found. Is the repo cloned?"
        exit 1
    fi
    if ! systemctl is-active --quiet mysql; then
        echo "[setup] ERROR: MySQL is not running on this machine. canine-db-worker requires a local MySQL instance."
        exit 1
    fi
    composer_install "$DATABASE_DIR"
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
    echo "[setup] canine-db-worker installed, enabled, and started"
}

case "$ROLE" in
    frontend)
        install_frontend
        ;;
    dbridge)
        install_dbridge
        ;;
    db)
        install_db
        ;;
    all)
        echo "[setup] No role specified — installing all applicable services"
        [ -f "$BACKEND_DIR/frontend.php" ] && install_frontend
        [ -f "$BACKEND_DIR/dbridge.php" ]  && install_dbridge
        [ -f "$DATABASE_DIR/db_worker.php" ] && systemctl is-active --quiet mysql && install_db
        ;;
    *)
        echo "Usage: $0 [frontend|dbridge|db]"
        echo "  frontend  — Steven's Node1"
        echo "  dbridge   — Derrick's LB"
        echo "  db        — Henil's Node2 (requires local MySQL)"
        exit 1
        ;;
esac

echo ""
echo "[setup] Done. Current status:"
sudo systemctl status canine-frontend canine-dbridge canine-db-worker --no-pager 2>/dev/null | grep -E "●|Active|canine"
