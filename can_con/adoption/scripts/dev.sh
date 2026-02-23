#!/usr/bin/env bash
set -e 

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

#Load team secrets
set -a 
source "$ROOT/.env"
set +a

mkdir -p "$ROOT/storage"


echo "Starting MySQL..."
sudo systemctl start mysql

echo "Starting RabbitMQ..."
sudo systemctl start rabbitmq-server

# Check and enable RabbitMQ management plugin
echo " Checking RabbitMQ management plugin..."
if ! sudo rabbitmq-plugins list | grep -q "rabbitmq_management.*E"; then
    echo "   Enabling management plugin..."
    sudo rabbitmq-plugins enable rabbitmq_management
else
    echo "   Management plugin already enabled"
fi


echo " Waiting for RabbitMQ to be ready..."
sleep 3

# VM IP for displaying URLs
VM_IP="$(hostname -I | awk '{print $1}')"

# Show RabbitMQ access info
echo "RabbitMQ Management: http://$VM_IP:15672"
if sudo rabbitmqctl list_users | grep -q "admin"; then
    echo "   Login with your admin credentials"
else
    echo "   No admin user found. Run: sudo rabbitmqctl add_user admin your_password"
fi

#start backend
if ! lsof -ti TCP:"$backend_port" >/dev/null 2>&1; then
	echo "Starting Backend on port $backend_port..."
	(cd "$ROOT/backend" && composer install --no-interaction >/dev/null 2>&1 || true)
	nohup php -S "backend_host:$backend_port" -t "$ROOT/backend/public" \
		> "$ROOT/storage/backend.log" 2>&1 &
	echo "   Backend started"
else
	echo "   Backend already running on port $backend_port"
fi


#start frontend
if ! lsof -ti TCP:"$frontend_port" >/dev/null 2>&1; then
	echo "Starting Frontend on port $frontend_port..."
	(cd "$ROOT/frontend" && npm install >/dev/null 2>&1 || true)
	nohup npm --prefix "$ROOT/frontend" run dev -- --host "$frontend_host" --port "$frontend_port" \
	       > "$ROOT/storage/frontend.log" 2>&1 &
	echo "   Frontend started"
else
	echo "   Frontend already running on port $frontend_port"
fi

# service URLs 
echo ""
echo "=========================================="
echo "ALL SERVICES RUNNING!"
echo "=========================================="
echo "MySQL: Running locally"
echo "RabbitMQ: http://$VM_IP:15672"
echo "Backend API: http://$VM_IP:$backend_port"
echo "Frontend: http://$VM_IP:$frontend_port"
echo "=========================================="
echo "Logs: $ROOT/storage/backend.log"
echo "Logs: $ROOT/storage/frontend.log"
echo "=========================================="

