#!/usr/bin/env bash
set -e 

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

#Load team secrets
set -a 
source "$ROOT/.env"
set +a

mkdir -p "$ROOT/storage"

#start infra services
sudo systemctl start mysql
sudo systemctl start rabbitmq-server

#start backend

if ! lsof -ti TCP:"$backend_port" >/dev/null 2>&1; then
	(cd "$ROOT/backend" && composer install --no-interaction >/dev/null 2>&1 || true)
	nohup php -S "backend_host:$backend_port" -t "$ROOT/backend/public" \
		> "$ROOT/storage/backend.log" 2>&1 &
fi


#start frontend
if ! lsof -ti TCP:"$frontend_port" >/dev/null 2>&1; then
	(cd "$ROOT/frontend" && npm install >/dev/null 2>&1 || true)
	nohup npm --prefix "$ROOT/frontend" run dev -- --host "$frontend_host" --port "$frontend_port" \
	       > "$ROOT/storage/frontend.log" 2>&1 &
fi

VM_IP="$(hostname -I | awk '{print $1}')"
echo "Frontend: http://$VM_IP:$frontend_port"
echo "Backend: http://$VM_IP:$backend_port"
echo "Logs: storage/frontend.log staorage/backend.log"
how do i combine my file with your example without changing anything to it
