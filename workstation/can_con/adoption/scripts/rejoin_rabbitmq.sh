#!/bin/bash

PRIMARY="rabbit@rabbit1"
PRIMARY_IP="100.87.19.28"

LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ "$LOCAL_IP" == "100.87.19.28" ]; then
    echo "[ERROR] Do not run this on the primary node (100.87.19.28). Aborting."
    exit 1
fi

echo "******** RabbitMQ Cluster Rejoin ********"
echo "Running on: $(hostname) ($LOCAL_IP)"
echo "Rejoining cluster with primary: $PRIMARY"

echo ""
echo "******* Checking connectivity to primary *******"
if ! nc -zv $PRIMARY_IP 25672 2>/dev/null; then
    echo "[ERROR] Cannot reach $PRIMARY_IP on port 25672 — aborting."
    exit 1
fi
echo "[OK] Primary node is reachable."

echo ""
echo "******* Stopping RabbitMQ app *******"
sudo rabbitmqctl stop_app
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to stop RabbitMQ app."
    exit 1
fi

echo ""
echo "******* Resetting node *******"
sudo rabbitmqctl reset
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to reset node."
    exit 1
fi

echo ""
echo "******* Joining cluster *******"
sudo rabbitmqctl join_cluster $PRIMARY
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to join cluster."
    exit 1
fi

echo ""
echo "******* Starting RabbitMQ app *******"
sudo rabbitmqctl start_app
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start RabbitMQ app."
    exit 1
fi

echo ""
echo "******* Setting ha-policy *******"
sudo rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all"}' --apply-to all
if [ $? -ne 0 ]; then
    echo "[WARN] Failed to set ha-policy — may already be set or insufficient permissions."
fi

echo ""
echo "******* Verifying cluster status *******"
sudo rabbitmqctl cluster_status | grep -A 10 "Running Nodes"

echo ""
echo "******* Checking for network partitions *******"
PARTITIONS=$(sudo rabbitmqctl cluster_status | grep -A 2 "Network Partitions")
echo "$PARTITIONS"
if echo "$PARTITIONS" | grep -q "cannot communicate"; then
    echo "[ERROR] Network partition detected — manual intervention required."
else
    echo "[OK] No network partitions."
fi

echo ""
echo "******* Verifying ha-policy *******"
sudo rabbitmqctl list_policies

echo ""
echo "******* RabbitMQ Cluster Rejoin Complete *******"
