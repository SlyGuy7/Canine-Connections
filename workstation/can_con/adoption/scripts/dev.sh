SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/.env" ] && source "$SCRIPT_DIR/.env" || { echo "[ERROR-MSG] .env not found"; exit 1; }

kill_tunnels() {
    echo "[DEBUG-MSG] Clearing existing tunnels..."
    for port in $LOCAL_RABBITMQ_AMQP_PORT $LOCAL_RABBITMQ_UI_PORT $LOCAL_RABBITMQ_STOMP_PORT $LOCAL_MYSQL_PORT $LOCAL_PHP_PORT $LOCAL_FRONTEND_PORT; do
        fuser -k "${port}/tcp" &>/dev/null || true
    done
    for sock in /tmp/ssh_mux_*; do
        [ -S "$sock" ] && ssh -O exit -o ControlPath="$sock" unused &>/dev/null || true
    done
}

kill_tunnels

SSH_OPTS="-n -i $SSH_KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=5"

ssh_cmd() { ssh $SSH_OPTS "$1@$2" "$3"; }

check_ssh() {
    ssh_cmd "$1" "$2" "echo ok" &>/dev/null && return 0
    echo "[ERROR-MSG] Cannot reach $3 at $2"
    return 1
}

port_listening() { ssh_cmd "$1" "$2" "ss -lnt | grep -q :$3" &>/dev/null; }
is_active()      { ssh_cmd "$1" "$2" "systemctl is-active --quiet $3" &>/dev/null; }
dir_exists()     { ssh_cmd "$1" "$2" "[ -d '$3' ]" &>/dev/null; }

tunnel() {
    local user=$1 host=$2; shift 2
    ssh $SSH_OPTS -o ControlMaster=no -N $(printf -- '-L %s ' "$@") "$user@$host" &>/dev/null & disown
}

wait_for() {
    local fn=$1 label=$2 max=$3; shift 3
    for i in $(seq 1 "$max"); do
        $fn "$@" && return 0
        echo "[DEBUG-MSG] $label not ready ($i/$max)..."; sleep 2
    done
    echo "[ERROR-MSG] $label failed to start"; return 1
}

diag_node() {
    local label=$1 user=$2 host=$3; shift 3
    local results=()

    if ! ssh_cmd "$user" "$host" "echo ok" &>/dev/null; then
        printf "  [%-22s]  %-18s  UNREACHABLE\n" "$label" "$host"
        return
    fi

    for svc in "$@"; do
        if ssh_cmd "$user" "$host" "systemctl is-active --quiet $svc" &>/dev/null; then
            results+=("$svc=UP")
        else
            results+=("$svc=DOWN")
        fi
    done

    printf "  [%-22s]  %-18s  %s\n" "$label" "$host" "${results[*]}"
}

diag_mysql_node() {
    local label=$1 user=$2 host=$3
    if ! ssh_cmd "$user" "$host" "echo ok" &>/dev/null; then
        printf "  [%-22s]  %-18s  UNREACHABLE\n" "$label" "$host"
        return
    fi

    local svc mysql_status member_state
    svc=$(ssh_cmd "$user" "$host" "systemctl is-active mysql 2>/dev/null || echo inactive")
    member_state=$(ssh_cmd "$user" "$host" \
        "sudo mysql -e \"SELECT MEMBER_STATE FROM performance_schema.replication_group_members WHERE MEMBER_HOST=@@hostname\" 2>/dev/null | tail -1 || echo N/A")

    printf "  [%-22s]  %-18s  mysql=%-8s  group_replication=%s\n" "$label" "$host" "$svc" "$member_state"
}

diag_rabbitmq_node() {
    local label=$1 user=$2 host=$3
    if ! ssh_cmd "$user" "$host" "echo ok" &>/dev/null; then
        printf "  [%-22s]  %-18s  UNREACHABLE\n" "$label" "$host"
        return
    fi

    local svc cluster_name
    svc=$(ssh_cmd "$user" "$host" "systemctl is-active rabbitmq-server 2>/dev/null || echo inactive")
    cluster_name=$(ssh_cmd "$user" "$host" \
        "sudo rabbitmqctl cluster_status 2>/dev/null | grep -oP '(?<=Name: )[^ ]+' | head -1 || echo N/A")

    printf "  [%-22s]  %-18s  rabbitmq=%-8s  cluster=%s\n" "$label" "$host" "$svc" "$cluster_name"
}

diagnostics() {
    echo ""
    echo "[DIAGNOSTICS] ========================================================"
    echo "[DIAGNOSTICS] Running full cluster diagnostics..."
    echo ""

    echo "[DIAGNOSTICS] ── MySQL Nodes ──────────────────────────────────────────"
    diag_mysql_node "MySQL-Primary"  "$MYSQL_USER"  "$MYSQL_HOST"  &
    diag_mysql_node "MySQL-Node2"    "$MYSQL_NODE2_USER" "$MYSQL_NODE2_HOST" &
    diag_mysql_node "MySQL-Node3"    "$MYSQL_NODE3_USER" "$MYSQL_NODE3_HOST" &
    wait

    echo ""
    echo "[DIAGNOSTICS] ── RabbitMQ Nodes ────────────────────────────────────────"
    diag_rabbitmq_node "RabbitMQ-Node1" "$RABBITMQ_SSH_USER"    "$RABBITMQ_HOST"       &
    diag_rabbitmq_node "RabbitMQ-Node2" "$RABBITMQ_NODE2_USER" "$RABBITMQ_NODE2_HOST" &
    diag_rabbitmq_node "RabbitMQ-Node3" "$RABBITMQ_NODE3_USER" "$RABBITMQ_NODE3_HOST" &
    wait

    echo ""
    echo "[DIAGNOSTICS] ── App Nodes ─────────────────────────────────────────────"
    diag_node "PHP-Backend"   "$PHP_USER"      "$PHP_HOST"      &
    diag_node "Frontend-LB"   "$FRONTEND_USER" "$FRONTEND_HOST" &
    wait

    echo ""
    echo "[DIAGNOSTICS] ========================================================"
    echo ""
}

start_rabbitmq() {
    echo "[STARTING - - - ] **** RabbitMQ ****"
    check_ssh "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" "RabbitMQ" || return 1

    if is_active "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" "rabbitmq-server"; then
        echo "[DEBUG-MSG] RabbitMQ already running"
    else
        echo "[DEBUG-MSG] Starting RabbitMQ..."
        ssh_cmd "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" \
            "sudo systemctl enable rabbitmq-server && sudo systemctl restart rabbitmq-server"
        wait_for port_listening "RabbitMQ" 30 "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" 5672 || return 1
    fi

    ssh_cmd "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" \
        "sudo rabbitmq-plugins enable rabbitmq_management rabbitmq_web_stomp &>/dev/null || true"

    echo "[DEBUG-MSG] Ensuring RabbitMQ user '$RABBITMQ_USER'..."
    ssh_cmd "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" "
        sudo rabbitmqctl add_user '$RABBITMQ_USER' '$RABBITMQ_PASS' 2>/dev/null || \
            sudo rabbitmqctl change_password '$RABBITMQ_USER' '$RABBITMQ_PASS'
        sudo rabbitmqctl set_user_tags '$RABBITMQ_USER' administrator
        sudo rabbitmqctl set_permissions -p / '$RABBITMQ_USER' '.*' '.*' '.*'
    "

    tunnel "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" \
        "${LOCAL_RABBITMQ_AMQP_PORT}:localhost:5672" \
        "${LOCAL_RABBITMQ_UI_PORT}:localhost:15672" \
        "${LOCAL_RABBITMQ_STOMP_PORT}:localhost:15674"

    echo "[DEBUG-MSG] RabbitMQ ready"
    echo "[DEBUG-MSG]   AMQP -> amqp://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_AMQP_PORT}"
    echo "[DEBUG-MSG]   UI   -> http://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_UI_PORT}/"
}

start_mysql() {
    echo "[STARTING - - - ] **** MySQL ****"
    check_ssh "$MYSQL_USER" "$MYSQL_HOST" "MySQL" || return 1

    if is_active "$MYSQL_USER" "$MYSQL_HOST" "mysql"; then
        echo "[DEBUG-MSG] MySQL already running"
    else
        echo "[DEBUG-MSG] Starting MySQL..."
        ssh_cmd "$MYSQL_USER" "$MYSQL_HOST" \
            "sudo systemctl enable mysql && sudo systemctl restart mysql"
        wait_for is_active "MySQL" 10 "$MYSQL_USER" "$MYSQL_HOST" "mysql" || return 1
    fi

    tunnel "$MYSQL_USER" "$MYSQL_HOST" "${LOCAL_MYSQL_PORT}:localhost:3306"
    echo "[DEBUG-MSG] MySQL ready -> ${MYSQL_HOST}:${LOCAL_MYSQL_PORT}"
}

start_php() {
    echo "[STARTING - - - ] **** PHP Backend ****"
    check_ssh "$PHP_USER" "$PHP_HOST" "PHP" || return 1

    dir_exists "$PHP_USER" "$PHP_HOST" "$PHP_DIR" || {
        echo "[ERROR-MSG] PHP_DIR not found on remote: $PHP_DIR"; return 1
    }

    if port_listening "$PHP_USER" "$PHP_HOST" "$PHP_PORT"; then
        echo "[DEBUG-MSG] PHP already running"
    else
        ssh_cmd "$PHP_USER" "$PHP_HOST" "fuser -k ${PHP_PORT}/tcp &>/dev/null || true"
        echo "[DEBUG-MSG] Running composer install..."
        ssh_cmd "$PHP_USER" "$PHP_HOST" \
            "cd '$PHP_DIR' && composer install --no-interaction --prefer-dist --optimize-autoloader -q 2>&1 | tail -1; setsid bash -lc 'php -S 0.0.0.0:${PHP_PORT} -t public' > /tmp/php.log 2>&1 < /dev/null &"
        echo "[DEBUG-MSG] Starting PHP server..."
        sleep 2
        wait_for port_listening "PHP" 20 "$PHP_USER" "$PHP_HOST" "$PHP_PORT" || {
            echo "[ERROR-MSG] PHP failed. Log:"
            ssh_cmd "$PHP_USER" "$PHP_HOST" "tail -n 20 /tmp/php.log" || true
            return 1
        }
    fi

    tunnel "$PHP_USER" "$PHP_HOST" "127.0.0.1:${LOCAL_PHP_PORT}:localhost:${PHP_PORT}"
    echo "[DEBUG-MSG] PHP ready -> http://${PHP_HOST}:${LOCAL_PHP_PORT}/"
}

start_frontend() {
    echo "[STARTING - - - ] **** Frontend ****"
    check_ssh "$FRONTEND_USER" "$FRONTEND_HOST" "Frontend" || return 1

    dir_exists "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_DIR" || {
        echo "[ERROR-MSG] FRONTEND_DIR not found on remote: $FRONTEND_DIR"; return 1
    }

    if port_listening "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT"; then
        echo "[DEBUG-MSG] Frontend already running"
    else
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "fuser -k ${FRONTEND_PORT}/tcp &>/dev/null || true"
        echo "[DEBUG-MSG] Running npm install + starting frontend..."
        ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" \
            "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; nvm use 24 &>/dev/null || true; cd '$FRONTEND_DIR' && npm install --silent 2>&1 | tail -1; setsid bash -lc 'npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT}' > /tmp/vite.log 2>&1 < /dev/null &"
        sleep 3
        wait_for port_listening "Frontend" 20 "$FRONTEND_USER" "$FRONTEND_HOST" "$FRONTEND_PORT" || {
            echo "[ERROR-MSG] Frontend failed. Log:"
            ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "tail -n 20 /tmp/vite.log" || true
            return 1
        }
    fi

    tunnel "$FRONTEND_USER" "$FRONTEND_HOST" "${LOCAL_FRONTEND_PORT}:localhost:${FRONTEND_PORT}"
    echo "[DEBUG-MSG] Frontend ready -> http://${FRONTEND_HOST}:${LOCAL_FRONTEND_PORT}/"
}

stop_rabbitmq() {
    echo "[STOPPING - - - ] **** RabbitMQ ****"
    check_ssh "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" "RabbitMQ" || return 1
    echo "[DEBUG-MSG] Stopping rabbitmq-server..."
    ssh_cmd "$RABBITMQ_SSH_USER" "$RABBITMQ_HOST" "sudo systemctl stop rabbitmq-server" || true
    fuser -k "${LOCAL_RABBITMQ_AMQP_PORT}/tcp" &>/dev/null || true
    fuser -k "${LOCAL_RABBITMQ_UI_PORT}/tcp" &>/dev/null || true
    echo "[DEBUG-MSG] RabbitMQ stopped"
}

stop_mysql() {
    echo "[STOPPING - - - ] **** MySQL ****"
    check_ssh "$MYSQL_USER" "$MYSQL_HOST" "MySQL" || return 1
    echo "[DEBUG-MSG] Stopping mysql..."
    ssh_cmd "$MYSQL_USER" "$MYSQL_HOST" "sudo systemctl stop mysql" || true
    fuser -k "${LOCAL_MYSQL_PORT}/tcp" &>/dev/null || true
    echo "[DEBUG-MSG] MySQL stopped"
}

stop_php() {
    echo "[STOPPING - - - ] **** PHP Backend ****"
    check_ssh "$PHP_USER" "$PHP_HOST" "PHP" || return 1
    echo "[DEBUG-MSG] Killing PHP server on port ${PHP_PORT}..."
    ssh_cmd "$PHP_USER" "$PHP_HOST" "fuser -k ${PHP_PORT}/tcp &>/dev/null || true"
    fuser -k "${LOCAL_PHP_PORT}/tcp" &>/dev/null || true
    echo "[DEBUG-MSG] PHP stopped"
}

stop_frontend() {
    echo "[STOPPING - - - ] **** Frontend ****"
    check_ssh "$FRONTEND_USER" "$FRONTEND_HOST" "Frontend" || return 1
    echo "[DEBUG-MSG] Killing frontend on port ${FRONTEND_PORT}..."
    ssh_cmd "$FRONTEND_USER" "$FRONTEND_HOST" "fuser -k ${FRONTEND_PORT}/tcp &>/dev/null || true"
    fuser -k "${LOCAL_FRONTEND_PORT}/tcp" &>/dev/null || true
    echo "[DEBUG-MSG] Frontend stopped"
}

stop_all() {
    echo "[STOPPING - - - ] **** All Services ****"
    stop_rabbitmq & stop_mysql & stop_php & stop_frontend &
    wait
    echo "[DEBUG-MSG] All services stopped"
}

deploy() {
    echo "[DEPLOY] ============================================================"
    echo "[DEPLOY] Starting zero-downtime deployment..."

    local DEPLOY_DATA="deploy.json"
    local LB_IP="$PHP_HOST"
    local LB_USER="$PHP_USER"
    local NODE1_IP="$FRONTEND_HOST"
    local NODE2_IP="$MYSQL_HOST"

    echo "[DEPLOY] Discarding local changes to $DEPLOY_DATA and pulling latest..."
    git -C "$SCRIPT_DIR/../.." checkout "$DEPLOY_DATA" 2>/dev/null || true
    git -C "$SCRIPT_DIR/../.." pull origin main

    echo "[DEPLOY] Building frontend..."
    npm install --silent
    npm run build

    local ACTIVE_NODE
    ACTIVE_NODE=$(awk -F'"' '/active_node/ {print $4}' "$DEPLOY_DATA")
    echo "[DEPLOY] Current active node: $ACTIVE_NODE"

    if [ "$ACTIVE_NODE" == "node1" ]; then
        echo "[DEPLOY] Draining traffic from Node2 ($NODE2_IP)..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE2_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Deploying to Node2 ($NODE2_IP)..."
        scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/. "$MYSQL_USER@$NODE2_IP:/var/www/html/"

        echo "[DEPLOY] Switching traffic to Node2, draining Node1 ($NODE1_IP)..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE2_IP/s/^#//' /etc/nginx/nginx.conf && sudo sed -i '/$NODE1_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Deploying to Node1 ($NODE1_IP)..."
        ssh_cmd "$FRONTEND_USER" "$NODE1_IP" "sudo cp -r /tmp/dist/. /var/www/html/" || \
            scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/. "$FRONTEND_USER@$NODE1_IP:/var/www/html/"

        echo "[DEPLOY] Re-enabling both nodes..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE1_IP/s/^#//' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Updating deploy.json -> node2..."
        sed -i 's/node1/node2/g' "$DEPLOY_DATA"
        git -C "$SCRIPT_DIR/../.." add "$DEPLOY_DATA" && \
            git -C "$SCRIPT_DIR/../.." commit -m "deploy: switch active_node to node2" && \
            git -C "$SCRIPT_DIR/../.." push origin main
    else
        echo "[DEPLOY] Draining traffic from Node1 ($NODE1_IP)..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE1_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Deploying to Node1 ($NODE1_IP)..."
        ssh_cmd "$FRONTEND_USER" "$NODE1_IP" "sudo cp -r /tmp/dist/. /var/www/html/" || \
            scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/. "$FRONTEND_USER@$NODE1_IP:/var/www/html/"

        echo "[DEPLOY] Switching traffic to Node1, draining Node2 ($NODE2_IP)..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE1_IP/s/^#//' /etc/nginx/nginx.conf && sudo sed -i '/$NODE2_IP/s/^/#/' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Deploying to Node2 ($NODE2_IP)..."
        scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/. "$MYSQL_USER@$NODE2_IP:/var/www/html/"

        echo "[DEPLOY] Re-enabling both nodes..."
        ssh_cmd "$LB_USER" "$LB_IP" "sudo sed -i '/$NODE2_IP/s/^#//' /etc/nginx/nginx.conf && sudo nginx -s reload"

        echo "[DEPLOY] Updating deploy.json -> node1..."
        sed -i 's/node2/node1/g' "$DEPLOY_DATA"
        git -C "$SCRIPT_DIR/../.." add "$DEPLOY_DATA" && \
            git -C "$SCRIPT_DIR/../.." commit -m "deploy: switch active_node to node1" && \
            git -C "$SCRIPT_DIR/../.." push origin main
    fi

    echo "[DEPLOY] Deployment complete."
    echo "[DEPLOY] ============================================================"
}

status_all() {
    echo "[STATUS] Checking all services..."
    for svc in \
        "RabbitMQ|$RABBITMQ_SSH_USER|$RABBITMQ_HOST|rabbitmq-server" \
        "MySQL|$MYSQL_USER|$MYSQL_HOST|mysql"
    do
        IFS='|' read -r label user host service <<< "$svc"
        printf "[STATUS] %-12s -> %s\n" "$label" \
            "$(ssh_cmd "$user" "$host" "systemctl is-active $service" 2>/dev/null || echo unreachable)"
    done
    for svc in \
        "PHP|$PHP_USER|$PHP_HOST|$PHP_PORT" \
        "Frontend|$FRONTEND_USER|$FRONTEND_HOST|$FRONTEND_PORT"
    do
        IFS='|' read -r label user host port <<< "$svc"
        port_listening "$user" "$host" "$port" \
            && printf "[STATUS] %-12s -> running\n" "$label" \
            || printf "[STATUS] %-12s -> stopped\n" "$label"
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
    echo "[DEBUG-MSG] RabbitMQ UI -> http://${RABBITMQ_HOST}:${LOCAL_RABBITMQ_UI_PORT}/"
    echo "[DEBUG-MSG] PHP API     -> http://${PHP_HOST}:${LOCAL_PHP_PORT}/"
    echo "[DEBUG-MSG] Frontend    -> http://${FRONTEND_HOST}:${LOCAL_FRONTEND_PORT}/"
    echo "[DEBUG-MSG] Use './dev.sh stop' to shut everything down."
    echo "[DEBUG-MSG] ########################################################"
}

case "${1:-start}" in
    start)              start_all       ;;
    stop)               stop_all        ;;
    restart)            stop_all; sleep 2; start_all ;;
    status)             status_all      ;;
    diag|diagnostics)   diagnostics     ;;
    deploy)             deploy          ;;
    rabbitmq)           start_rabbitmq  ;;
    rabbitmq_start)     start_rabbitmq  ;;
    rabbitmq_stop)      stop_rabbitmq   ;;
    mysql)              start_mysql     ;;
    mysql_start)        start_mysql     ;;
    mysql_stop)         stop_mysql      ;;
    php|backend)        start_php       ;;
    php_start)          start_php       ;;
    php_stop)           stop_php        ;;
    frontend)           start_frontend  ;;
    frontend_start)     start_frontend  ;;
    frontend_stop)      stop_frontend   ;;
    *) echo "Usage: $0 {start|stop|restart|status|diag|deploy}"
       echo "       $0 {rabbitmq|rabbitmq_start|rabbitmq_stop}"
       echo "       $0 {mysql|mysql_start|mysql_stop}"
       echo "       $0 {php|backend|php_start|php_stop}"
       echo "       $0 {frontend|frontend_start|frontend_stop}"
       ;;
esac