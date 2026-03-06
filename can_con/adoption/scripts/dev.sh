#!/bin/bash

if [ -f .env ]; then
    echo "[DEBUG] Loading .env file..."
    source .env
    echo "[DEBUG] .env loaded successfully"
else
    echo "[ERROR] .env file not found"
    echo "[INFO]  Run: create a .env file  then fill in your values"
    exit 1
fi


remote_exec() {
    local host=$1
    local user=$2
    local key=$3
    local cmd=$4

    echo "[DEBUG] SSH into $user@$host -> $cmd"

    ssh -i "$key" \
        -o ControlMaster=auto \
        -o ControlPersist=10m \
        -o ControlPath=/tmp/ssh_mux_%h_%p_%r \
        -o IdentitiesOnly=yes \
        -o BatchMode=yes \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        "$user@$host" "$cmd"
}


check_ssh() {
    local host=$1
    local user=$2
    local key=$3
    local label=$4

    echo "[DEBUG] Checking SSH connection to $label at $host..."

    if remote_exec "$host" "$user" "$key" "echo ok" > /dev/null 2>&1; then
        echo "[DEBUG] SSH connection to $label OK"
        return 0
    else
        echo "[ERROR] Cannot reach $label at $host"
        echo "[INFO]  Make sure Tailscale is running on that VM and your public key is in their authorized_keys"
        return 1
    fi
}


open_tunnel() {
    local key=$1
    local user=$2
    local host=$3
    shift 3

    for mapping in "$@"; do
        local_port=$(echo "$mapping" | cut -d: -f1)
        fuser -k ${local_port}/tcp 2>/dev/null || true
    done

    local ssh_args=()
    for mapping in "$@"; do
        ssh_args+=(-L "$mapping")
    done

    ssh -i "$key" \
        -o StrictHostKeyChecking=no \
        -N -f \
        "${ssh_args[@]}" \
        "$user@$host"
}


start_rabbitmq() {
    echo ""
    echo "[INFO] ---- Starting RabbitMQ ----"

    check_ssh "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" "RabbitMQ VM" || return 1

    echo "[DEBUG] Restarting RabbitMQ service..."

    remote_exec "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" \
        "sudo systemctl enable rabbitmq-server >/dev/null 2>&1 || true && \
         sudo systemctl restart rabbitmq-server"

    echo "[DEBUG] Waiting for RabbitMQ to become ready..."

    for i in {1..30}; do
        if remote_exec "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" \
            "sudo rabbitmq-diagnostics ping" > /dev/null 2>&1; then
            echo "[INFO] RabbitMQ is running"
            break
        fi

        echo "[DEBUG] RabbitMQ not ready yet ($i/30)..."
        sleep 2

        if [[ $i -eq 30 ]]; then
            echo "[ERROR] RabbitMQ failed to start"
            return 1
        fi
    done

    echo "[DEBUG] Enabling RabbitMQ management plugin..."

    remote_exec "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" \
        "sudo rabbitmq-plugins enable rabbitmq_management >/dev/null 2>&1 || true"

    open_tunnel "$SSH_KEY" "$RABBITMQ_USER" "$RABBITMQ_HOST" \
        "${LOCAL_RABBITMQ_AMQP_PORT}:localhost:5672" \
        "${LOCAL_RABBITMQ_UI_PORT}:localhost:15672"

    echo "[INFO] RabbitMQ ready"
    echo "[INFO]   AMQP -> localhost:$LOCAL_RABBITMQ_AMQP_PORT"
    echo "[INFO]   UI   -> http://localhost:$LOCAL_RABBITMQ_UI_PORT"
}


start_mysql() {
    echo ""
    echo "[INFO] ---- Starting MySQL ----"

    check_ssh "$MYSQL_HOST" "$MYSQL_USER" "$SSH_KEY" "MySQL VM" || return 1

    remote_exec "$MYSQL_HOST" "$MYSQL_USER" "$SSH_KEY" \
        "sudo systemctl enable mysql && sudo systemctl restart mysql"

    for i in {1..10}; do
        remote_exec "$MYSQL_HOST" "$MYSQL_USER" "$SSH_KEY" \
            "sudo systemctl is-active mysql" > /dev/null 2>&1 && break
        echo "[DEBUG] MySQL not ready yet ($i/10)..."
        sleep 2
        [[ $i -eq 10 ]] && { echo "[ERROR] MySQL failed to start"; return 1; }
    done

    open_tunnel "$SSH_KEY" "$MYSQL_USER" "$MYSQL_HOST" \
        "${LOCAL_MYSQL_PORT}:localhost:3306"

    echo "[INFO] MySQL ready"
}


start_php() {
    echo ""
    echo "[INFO] ---- Starting PHP Backend ----"

    check_ssh "$PHP_HOST" "$PHP_USER" "$SSH_KEY" "PHP VM" || return 1

    echo "[DEBUG] Killing any existing PHP server processes..."
    remote_exec "$PHP_HOST" "$PHP_USER" "$SSH_KEY" \
        "pkill -f 'php -S' 2>/dev/null || true"

    echo "[DEBUG] Running composer install and starting PHP server..."
    remote_exec "$PHP_HOST" "$PHP_USER" "$SSH_KEY" \
        "cd ${PHP_DIR} && composer install --no-interaction --prefer-dist --optimize-autoloader && nohup php -S 0.0.0.0:${PHP_PORT} -t public > /tmp/php-server.log 2>&1 & disown"

    echo "[DEBUG] Waiting for PHP server to respond..."

    for i in {1..10}; do
        if remote_exec "$PHP_HOST" "$PHP_USER" "$SSH_KEY" "ss -lnt | grep :${PHP_PORT}" > /dev/null 2>&1; then
            echo "[INFO] PHP backend is running"
            break
        fi

        echo "[DEBUG] PHP server not ready yet ($i/10)..."
        sleep 2
    done

    open_tunnel "$SSH_KEY" "$PHP_USER" "$PHP_HOST" \
        "127.0.0.1:${LOCAL_PHP_PORT}:localhost:${PHP_PORT}"

    echo "[INFO] PHP backend ready"
    echo "[INFO]   API -> http://localhost:$LOCAL_PHP_PORT"
}


start_frontend() {
    echo ""
    echo "[INFO] ---- Starting Frontend ----"

    check_ssh "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" "Frontend VM" || return 1

    remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" \
        "fuser -k ${FRONTEND_PORT}/tcp 2>/dev/null || true"

    remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" \
        "cd ${FRONTEND_DIR} && npm install --silent"

    remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" \
        "cd ${FRONTEND_DIR} && nohup npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT} > /tmp/vite.log 2>&1 &"

    for i in {1..15}; do
        remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" \
            "ss -lnt | grep :${FRONTEND_PORT}" > /dev/null 2>&1 && break
        echo "[DEBUG] Frontend not ready yet ($i/15)..."
        sleep 2
    done

    open_tunnel "$SSH_KEY" "$FRONTEND_USER" "$FRONTEND_HOST" \
        "${LOCAL_FRONTEND_PORT}:localhost:${FRONTEND_PORT}"

    echo "[INFO] Frontend ready"
}


stop_all() {
    echo "[INFO] Stopping services..."

    remote_exec "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" "sudo systemctl stop rabbitmq-server" || true
    remote_exec "$MYSQL_HOST" "$MYSQL_USER" "$SSH_KEY" "sudo systemctl stop mysql" || true
    remote_exec "$PHP_HOST" "$PHP_USER" "$SSH_KEY" "pkill -f 'php -S'" || true
    remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" "pkill -f vite" || true

    for port in $LOCAL_RABBITMQ_AMQP_PORT $LOCAL_RABBITMQ_UI_PORT $LOCAL_MYSQL_PORT $LOCAL_PHP_PORT $LOCAL_FRONTEND_PORT; do
        fuser -k "${port}/tcp" 2>/dev/null || true
    done

    echo "[INFO] Services stopped"
}


status_all() {
    echo "[INFO] Checking services..."

    remote_exec "$RABBITMQ_HOST" "$RABBITMQ_USER" "$SSH_KEY" "systemctl is-active rabbitmq-server" || true
    remote_exec "$MYSQL_HOST" "$MYSQL_USER" "$SSH_KEY" "systemctl is-active mysql" || true
    remote_exec "$PHP_HOST" "$PHP_USER" "$SSH_KEY" "ss -lnt | grep :${PHP_PORT} && echo PHP running" || true
    remote_exec "$FRONTEND_HOST" "$FRONTEND_USER" "$SSH_KEY" "ss -lnt | grep :${FRONTEND_PORT} && echo Frontend running" || true
}


case "${1:-start}" in
    start)
        echo "[INFO] Starting all services..."
        start_rabbitmq
        start_mysql
        start_php
        start_frontend
        echo "[INFO] All services started"
        wait
        ;;

    stop)
        stop_all
        ;;

    restart)
        stop_all
        sleep 2
        start_rabbitmq
        start_mysql
        start_php
        start_frontend
        ;;

    status)
        status_all
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status}"
        ;;
esac
