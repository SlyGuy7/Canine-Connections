#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/.env" ] && source "$SCRIPT_DIR/.env" || { echo "[ERROR-MSG] .env not found"; exit 1; }

kill_tunnels() {
    echo "[DEBUG-MSG] Clearing existing tunnels..."
    for port in $LOCAL_RABBITMQ_AMQP_PORT $LOCAL_RABBITMQ_UI_PORT $LOCAL_MYSQL_PORT $LOCAL_PHP_PORT $LOCAL_FRONTEND_PORT; do
        fuser -k "${port}/tcp" &>/dev/null || true
    done
    for sock in /tmp/ssh_mux_*; do
        [ -S "$sock" ] && ssh -O exit -o ControlPath="$sock" unused &>/dev/null || true
    done
}

kill_tunnels

ssh_cmd() {
    ssh -n -i "$SSH_KEY" \
        -o StrictHostKeyChecking=no \
        -o BatchMode=yes \
        -o ConnectTimeout=10 \
        "$1@$2" "$3"
}

check_ssh() {
    ssh_cmd "$1" "$2" "echo ok" &>/dev/null || {
        echo "[ERROR-MSG] Cannot reach $3 at $2"
        return 1
    }
}

port_listening() { ssh_cmd "$1" "$2" "ss -lnt | grep -q :$3" &>/dev/null; }
is_active()      { ssh_cmd "$1" "$2" "systemctl is-active --quiet $3" &>/dev/null; }
dir_exists()     { ssh_cmd "$1" "$2" "[ -d '$3' ]" &>/dev/null; }

tunnel() {
    local user=$1 host=$2; shift 2
    ssh -n -i "$SSH_KEY" \
        -o StrictHostKeyChecking=no \
        -o BatchMode=yes \
        -o ControlMaster=no \
        -N $(printf -- '-L %s ' "$@") "$user@$host" &>/dev/null & disown
}

wait_for() {
    local fn=$1 label=$2 max=$3; shift 3
    for i in $(seq 1 "$max"); do
        $fn "$@" && return 0
        echo "[DEBUG-MSG] $label not ready ($i/$max)..."; sleep 2
    done
    echo "[ERROR-MSG] $label failed to start"; return 1
}

start_rabbitmq() {
    echo "[STARTING - - - ] **** RabbitMQ ****"
    check_ssh "$RABBITMQ_USER" "$RABBITMQ_HOST" "RabbitMQ" || return 1

    if is_active "$RABBITMQ_USER" "$RABBITMQ_HOST" "rabbitmq-server"; then
        echo " RabbitMQ already running"
    else
        echo "[DEBUG-MSG] Starting RabbitMQ..."
        ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" \
            "sudo systemctl enable rabbitmq-server && sudo systemctl restart rabbitmq-server"
        wait_for port_listening "RabbitMQ" 30 "$RABBITMQ_USER" "$RABBITMQ_HOST" 5672 || return 1
    fi

    ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" \
        "sudo rabbitmq-plugins enable rabbitmq_management &>/dev/null || true"

    tunnel "$RABBITMQ_USER" "$RABBITMQ_HOST" \
        "${LOCAL_RABBITMQ_AMQP_PORT}:localhost:5672" \
        "${LOCAL_RABBITMQ_UI_PORT}:localhost:15672"

    echo "[DEBUG-MSG] RabbitMQ ready"
    echo "[DEBUG-MSG]   AMQP -> amqp://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_AMQP_PORT}"
    echo "[DEBUG-MSG]   UI   -> http://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_UI_PORT}/"
}

start_mysql() {
    echo "[STARTING - - - ] **** MySQL ****"
    check_ssh "$MYSQL_USER" "$MYSQL_HOST" "MySQL" || return 1

    if is_active "$MYSQL_USER" "$MYSQL_HOST" "mysql"; then
        echo " MySQL already running"
    else
        echo "[DEBUG-MSG] Starting MySQL..."
        ssh_cmd "$MYSQL_USER" "$MYSQL_HOST" \
            "sudo systemctl enable mysql && sudo systemctl restart mysql"
        wait_for is_active "MySQL" 10 "$MYSQL_USER" "$MYSQL_HOST" "mysql" || return 1
    fi

    tunnel "$MYSQL_USER" "$MYSQL_HOST" "${LOCAL_MYSQL_PORT}:localhost:3306"
    echo " MySQL ready -> ${MYSQL_HOST}:${LOCAL_MYSQL_PORT}"
}

start_php() {
    echo "[STARTING - - - ] **** PHP Backend ****"
    check_ssh "$PHP_USER" "$PHP_HOST" "PHP" || return 1

    dir_exists "$PHP_USER" "$PHP_HOST" "$PHP_DIR" || {
        echo "[ERROR-MSG] PHP_DIR not found on remote: $PHP_DIR"; return 1
    }

    if port_listening "$PHP_USER" "$PHP_HOST" "$PHP_PORT"; then
        echo " PHP already running"
    else
        ssh_cmd "$PHP_USER" "$PHP_HOST" "fuser -k ${PHP_PORT}/tcp &>/dev/null || true"
        echo "[DEBUG-MSG] Running composer install..."
        ssh_cmd "$PHP_USER" "$PHP_HOST" \
            "cd '$PHP_DIR' && composer install --no-interaction --prefer-dist --optimize-autoloader -q 2>&1 | tail -1; setsid bash -lc 'php -S 0.0.0.0:${PHP_PORT} -t public' > /tmp/php.log 2>&1 < /dev/null &"
        echo "[DEBUG-MSG] Starting PHP server..."
        sleep 2
        wait_for port_listening "PHP" 20 "$PHP_USER" "$PHP_HOST" "$PHP_PORT" || {
            echo "[ERROR-MSG] PHP failed. Log:"; ssh_cmd "$PHP_USER" "$PHP_HOST" "tail -n 20 /tmp/php.log" || true
            return 1
        }
    fi

    tunnel "$PHP_USER" "$PHP_HOST" "127.0.0.1:${LOCAL_PHP_PORT}:localhost:${PHP_PORT}"
    echo " PHP ready -> http://${PHP_HOST}:${LOCAL_PHP_PORT}/"
}

start_frontend() {
    echo "[STARTING - - - ] **** Frontend ****"
    check_ssh "$FRONTEND_USER" "$FRONTEND_HOST" "Frontend" || return 1

    dir_exists "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_DIR" || {
        echo "[ERROR-MSG] FRONTEND_DIR not found on remote: $FRONTEND_DIR"; return 1
    }

    if port_listening "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT"; then
        echo " Frontend already running"
    else
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "fuser -k ${FRONTEND_PORT}/tcp &>/dev/null || true"
        echo "[DEBUG-MSG] Running npm install + starting frontend..."
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" \
            "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; nvm use 24 &>/dev/null || true; cd '$FRONTEND_DIR' && npm install --silent 2>&1 | tail -1; setsid bash -lc 'npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT}' > /tmp/vite.log 2>&1 < /dev/null &"
        sleep 3
        wait_for port_listening "Frontend" 20 "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT" || {
            echo "[ERROR-MSG] Frontend failed. Log:"; ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "tail -n 20 /tmp/vite.log" || true
            return 1
        }
    fi

    tunnel "$FRONTEND_USER" "$FRONTEND_HOST" "${LOCAL_FRONTEND_PORT}:localhost:${FRONTEND_PORT}"
    echo " Frontend ready -> http://${FRONTEND_HOST}:${LOCAL_FRONTEND_PORT}/"
}

stop_all() {
    echo " Stopping services..."
    ssh_cmd "$RABBITMQ_USER" "$RABBITMQ_HOST" "sudo systemctl stop rabbitmq-server" || true
    ssh_cmd "$MYSQL_USER"    "$MYSQL_HOST"    "sudo systemctl stop mysql"           || true
    ssh_cmd "$PHP_USER"      "$PHP_HOST"      "fuser -k ${PHP_PORT}/tcp &>/dev/null || true"
    ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "fuser -k ${FRONTEND_PORT}/tcp &>/dev/null || true"
    echo " All services stopped"
}

status_all() {
    echo " Checking all services..."
    for svc in \
        "RabbitMQ|$RABBITMQ_USER|$RABBITMQ_HOST|rabbitmq-server" \
        "MySQL|$MYSQL_USER|$MYSQL_HOST|mysql"
    do
        IFS='|' read -r label user host service <<< "$svc"
        printf "[DEBUG-MSG] %-12s -> %s\n" "$label" \
            "$(ssh_cmd "$user" "$host" "systemctl is-active $service" 2>/dev/null || echo unreachable)"
    done
    for svc in \
        "PHP|$PHP_USER|$PHP_HOST|$PHP_PORT" \
        "Frontend|$FRONTEND_USER|$FRONTEND_HOST|$FRONTEND_PORT"
    do
        IFS='|' read -r label user host port <<< "$svc"
        port_listening "$user" "$host" "$port" \
            && printf "[DEBUG-MSG] %-12s -> running\n" "$label" \
            || printf "[DEBUG-MSG] %-12s -> stopped\n" "$label"
    done
}

start_all() {
    start_rabbitmq
    start_mysql
    start_php &
    start_frontend &
    wait
    echo ""
    echo "[DEBUG-MSG] ########################################################"
    echo "[DEBUG-MSG] All services started."
    echo "[DEBUG-MSG] RabbitMQ UI -> http://127.0.0.1:${LOCAL_RABBITMQ_UI_PORT}/"
    echo "[DEBUG-MSG] PHP API     -> http://127.0.0.1:${LOCAL_PHP_PORT}/"
    echo "[DEBUG-MSG] Frontend    -> http://127.0.0.1:${LOCAL_FRONTEND_PORT}/"
    echo "[DEBUG-MSG] Use './dev.sh stop' to shut everything down."
    echo "[DEBUG-MSG] ########################################################"
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