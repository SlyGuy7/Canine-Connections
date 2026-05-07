#!/bin/bash
IS_PRIMARY=$(sudo mysql -N -e "SELECT IF(MEMBER_ROLE='PRIMARY', 'yes', 'no') FROM performance_schema.replication_group_members WHERE MEMBER_HOST=@@hostname;" 2>/dev/null)

if [ "$IS_PRIMARY" = "yes" ]; then
    echo "[db_worker] This node is PRIMARY — starting db_worker"
    sudo systemctl start canine-db-worker
else
    echo "[db_worker] This node is SECONDARY — db_worker will not start"
    sudo systemctl stop canine-db-worker 2>/dev/null
fi
