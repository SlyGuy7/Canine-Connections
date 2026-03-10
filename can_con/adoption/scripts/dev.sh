#!/bin/bash

[ -f .env ] && source .env || { echo "[ERROR] .env not found"; exit 1; }

kill_tunnels() {
    echo "[DEBUG] Clearing existing tunnels..."
    for port in $LOCAL_RABBITMQ_AMQP_PORT $LOCAL_RABBITMQ_UI_PORT $LOCAL_MYSQL_PORT $LOCAL_PHP_PORT $LOCAL_FRONTEND_PORT; do
        fuser -k "${port}/tcp" &>/dev/null || true
    done
    for sock in /tmp/ssh_mux_*; do
        [ -S "$sock" ] && ssh -O exit -o ControlPath="$sock" unused &>/dev/null || true
    done
}

kill_tunnels

# Shared SSH options — no mux for reliability
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10"

ssh_cmd() {
    # $1=user $2=host ${@:3}=command
    ssh $SSH_OPTS "$1@$2" "${@:3}"
}

check_ssh() {
    echo "[DEBUG] Connecting to $3..."
    ssh_cmd "$1" "$2" "echo ok" &>/dev/null && return 0
    echo "[ERROR] Cannot reach $3 at $2"
    return 1
}

is_active()      { ssh_cmd "$1" "$2" "systemctl is-active --quiet $3" &>/dev/null; }
port_listening() { ssh_cmd "$1" "$2" "ss -lnt | grep -q :$3" &>/dev/null; }

tunnel() {
    local user=$1 host=$2; shift 2
    ssh $SSH_OPTS -N $(printf -- '-L %s ' "$@") "$user@$host" &>/dev/null & disown
}

wait_for() {
    local fn=$1 label=$2 max=$3; shift 3
    for i in $(seq 1 "$max"); do
        $fn "$@" && return 0
        echo "[DEBUG] $label not ready ($i/$max)..."; sleep 2
    done
    echo "[ERROR] $label failed to start"; return 1
}

start_rabbitmq() {
    echo "[INFO] ---- RabbitMQ ----"
    check_ssh "$RABBITMQ_USER" "$RABBITMQ_HOST" "RabbitMQ" || return 1

    if is_active "$RABBITMQ_USER" "$RABBITMQ_HOST" "rabbitmq-server"; then
        echo "[INFO] RabbitMQ already running"
    else
        ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" \
            "sudo systemctl enable rabbitmq-server && sudo systemctl start rabbitmq-server"
        wait_for port_listening "RabbitMQ" 30 "$RABBITMQ_USER" "$RABBITMQ_HOST" 5672 || return 1
    fi

    ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" \
        "sudo rabbitmq-plugins enable rabbitmq_management &>/dev/null || true"
    tunnel "$RABBITMQ_USER" "$RABBITMQ_HOST" \
        "${LOCAL_RABBITMQ_AMQP_PORT}:localhost:5672" \
        "${LOCAL_RABBITMQ_UI_PORT}:localhost:15672"

    echo "[INFO] RabbitMQ ready"
    echo "[INFO]   AMQP -> amqp://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_AMQP_PORT}"
    echo "[INFO]   UI   -> http://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_UI_PORT}/"
}

start_mysql() {
    echo "[INFO] ---- MySQL ----"
    check_ssh "$MYSQL_USER" "$MYSQL_HOST" "MySQL" || return 1

    if is_active "$MYSQL_USER" "$MYSQL_HOST" "mysql"; then
        echo "[INFO] MySQL already running"
    else
        ssh_cmd "$MYSQL_USER" "$MYSQL_HOST" \
            "sudo systemctl enable mysql && sudo systemctl start mysql"
        wait_for is_active "MySQL" 10 "$MYSQL_USER" "$MYSQL_HOST" "mysql" || return 1
    fi

    tunnel "$MYSQL_USER" "$MYSQL_HOST" "${LOCAL_MYSQL_PORT}:localhost:3306"
    echo "[INFO] MySQL ready -> ${MYSQL_HOST}:${LOCAL_MYSQL_PORT}"
}

start_php() {
    echo "[INFO] ---- PHP Backend ----"
    check_ssh "$PHP_USER" "$PHP_HOST" "PHP" || return 1

    if port_listening "$PHP_USER" "$PHP_HOST" "$PHP_PORT"; then
        echo "[INFO] PHP already running"
    else
        ssh_cmd "$PHP_USER" "$PHP_HOST" "pkill -f 'php -S' || true"
        echo "[DEBUG] Running composer install..."
        # Run composer synchronously so we know it finished, then launch PHP detached
        ssh_cmd "$PHP_USER" "$PHP_HOST" \
            "cd ${PHP_DIR} && composer install --no-interaction --prefer-dist --optimize-autoloader -q 2>/dev/null"
        echo "[DEBUG] Starting PHP server..."
        ssh_cmd "$PHP_USER" "$PHP_HOST" \
            "setsid nohup php -S 0.0.0.0:${PHP_PORT} -t ${PHP_DIR}/public > /tmp/php-server.log 2>&1 < /dev/null &"
        wait_for port_listening "PHP" 10 "$PHP_USER" "$PHP_HOST" "$PHP_PORT" || return 1
    fi

    tunnel "$PHP_USER" "$PHP_HOST" "127.0.0.1:${LOCAL_PHP_PORT}:localhost:${PHP_PORT}"
    echo "[INFO] PHP ready -> http://${PHP_HOST}:${LOCAL_PHP_PORT}/"
}

start_frontend() {
    echo "[INFO] ---- Frontend ----"
    check_ssh "$FRONTEND_USER" "$FRONTEND_HOST" "Frontend" || return 1

    if port_listening "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT"; then
        echo "[INFO] Frontend already running"
    else
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "fuser -k ${FRONTEND_PORT}/tcp || true"
        echo "[DEBUG] Running npm install..."
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" \
            "cd ${FRONTEND_DIR} && npm install --silent 2>/dev/null"
        echo "[DEBUG] Starting frontend server..."
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" \
            "setsid nohup npm --prefix ${FRONTEND_DIR} run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT} > /tmp/vite.log 2>&1 < /dev/null &"
        wait_for port_listening "Frontend" 15 "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT" || return 1
    fi

    tunnel "$FRONTEND_USER" "$FRONTEND_HOST" "${LOCAL_FRONTEND_PORT}:localhost:${FRONTEND_PORT}"
    echo "[INFO] Frontend ready -> http://${FRONTEND_HOST}:${LOCAL_FRONTEND_PORT}/"
}

stop_all() {
    echo "[INFO] Stopping services..."
    ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" "sudo systemctl stop rabbitmq-server" || true
    ssh_cmd "$MYSQL_USER"    "$MYSQL_HOST"    "sudo systemctl stop mysql"           || true
    ssh_cmd "$PHP_USER"      "$PHP_HOST"      "pkill -f 'php -S'"                  || true
    ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "pkill -f vite"                      || true
    echo "[INFO] All services stopped"
}

status_all() {
    echo "[INFO] Checking services..."
    for svc in \
        "RabbitMQ|$RABBITMQ_USER|$RABBITMQ_HOST|rabbitmq-server" \
        "MySQL|$MYSQL_USER|$MYSQL_HOST|mysql"
    do
        IFS='|' read -r label user host service <<< "$svc"
        printf "[INFO] %-12s -> %s\n" "$label" \
            "$(ssh_cmd "$user" "$host" "systemctl is-active $service" 2>/dev/null || echo unreachable)"
    done
    for svc in \
        "PHP|$PHP_USER|$PHP_HOST|$PHP_PORT" \
        "Frontend|$FRONTEND_USER|$FRONTEND_HOST|$FRONTEND_PORT"
    do
        IFS='|' read -r label user host port <<< "$svc"
        port_listening "$user" "$host" "$port" \
            && printf "[INFO] %-12s -> running\n" "$label" \
            || printf "[INFO] %-12s -> stopped\n" "$label"
    done
}

start_all() {
    start_rabbitmq; start_mysql; start_php; start_frontend
    echo ""
    echo "[INFO] All services started. Tunnels running in background."
    echo "[INFO] Use './dev.sh stop' to shut everything down."
}

case "${1:-start}" in
    start)          start_all       ;;
    rabbitmq)       start_rabbitmq  ;;
    mysql)          start_mysql     ;;
    php|backend)    start_php       ;;
    frontend)       start_frontend  ;;
    stop)           stop_all        ;;
    restart)        stop_all; sleep 2; start_all ;;
    status)         status_all      ;;
    *) echo "Usage: $0 {start|stop|restart|status|rabbitmq|mysql|php|backend|frontend}" ;;
esac