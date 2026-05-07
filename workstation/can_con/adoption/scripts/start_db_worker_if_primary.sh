#!/bin/bash
DB_HOSTS=(${DB_HOST:-100.80.193.50} ${DB_HOST_2:-100.99.21.39} ${DB_HOST_3:-100.89.110.16})
DB_USER=${DB_USER:-adoption_user}
DB_PASS=${DB_PASS:-REDACTED}

IS_PRIMARY=$(sudo mysql -N -e "SELECT IF(MEMBER_ROLE='PRIMARY', 'yes', 'no') FROM performance_schema.replication_group_members WHERE MEMBER_HOST=@@hostname;" 2>/dev/null)

if [ "$IS_PRIMARY" = "yes" ]; then
    echo "[db_worker] This node is PRIMARY (group replication) — starting db_worker"
    sudo systemctl start canine-db-worker
    exit 0
fi

# Local MySQL is not primary — check if any cluster node has a writable primary
CLUSTER_HAS_PRIMARY=0
for host in "${DB_HOSTS[@]}"; do
    REMOTE_RO=$(mysql -h "$host" -u "$DB_USER" -p"$DB_PASS" -N -e "SELECT @@super_read_only;" 2>/dev/null)
    if [ "$REMOTE_RO" = "0" ]; then
        echo "[db_worker] Cluster primary found at $host — starting db_worker to connect remotely"
        CLUSTER_HAS_PRIMARY=1
        break
    fi
done

if [ "$CLUSTER_HAS_PRIMARY" = "1" ]; then
    sudo systemctl start canine-db-worker
else
    echo "[db_worker] No writable MySQL primary found in cluster — stopping db_worker"
    sudo systemctl stop canine-db-worker 2>/dev/null
fi
