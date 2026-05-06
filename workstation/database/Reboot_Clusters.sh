#!/bin/bash

DERYK_PASS="REDACTED"
STEVENV_PASS="REDACTED"
NODE1="100.80.193.50"
NODE2="100.99.21.39"
NODE3="100.89.110.16"
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "******** Booting MySQL Clusters ********"
echo "Running from: $LOCAL_IP"

check_node_status() {
    local label=$1
    local host=$2
    local state=$(sudo mysql -e "SELECT MEMBER_STATE FROM performance_schema.replication_group_members WHERE MEMBER_HOST='$host';" 2>/dev/null | grep -v MEMBER_STATE)
    echo "[$label] State: $state"
    if [[ "$state" == *"ERROR"* ]] || [[ "$state" == *"RECOVERING"* ]]; then
        echo "[ERROR] $label is in $state — check /var/log/mysql/error.log on $host"
        return 1
    fi
    return 0
}

bootstrap_node1_local() {
    sudo mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = "100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1";
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;
SQL
}

bootstrap_node1_remote() {
    ssh vmware@$NODE1 "sudo mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;
SQL"
}

join_node_local() {
    sudo mysql << SQL
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_group_seeds = '$NODE1:33061,$NODE2:33061,$NODE3:33061';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
CHANGE REPLICATION SOURCE TO SOURCE_USER='henil', SOURCE_PASSWORD='REDACTED' FOR CHANNEL 'group_replication_recovery';
START GROUP_REPLICATION;
SQL
}

run_mysql_node2() {
    ssh deryk@$NODE2 "sudo mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_group_seeds = '100.80.193.50:33061,100.99.21.39:33061,100.89.110.16:33061';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
CHANGE REPLICATION SOURCE TO SOURCE_USER='henil', SOURCE_PASSWORD='REDACTED' FOR CHANNEL 'group_replication_recovery';
START GROUP_REPLICATION;
SQL"
}

run_mysql_node2_fallback() {
    ssh -t deryk@$NODE2 "echo '$DERYK_PASS' | sudo -S mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_group_seeds = '100.80.193.50:33061,100.99.21.39:33061,100.89.110.16:33061';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
CHANGE REPLICATION SOURCE TO SOURCE_USER='henil', SOURCE_PASSWORD='REDACTED' FOR CHANNEL 'group_replication_recovery';
START GROUP_REPLICATION;
SQL"
}

run_mysql_node3() {
    ssh stevenv@$NODE3 "sudo mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_group_seeds = '100.80.193.50:33061,100.99.21.39:33061,100.89.110.16:33061';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
CHANGE REPLICATION SOURCE TO SOURCE_USER='henil', SOURCE_PASSWORD='REDACTED' FOR CHANNEL 'group_replication_recovery';
START GROUP_REPLICATION;
SQL"
}

run_mysql_node3_fallback() {
    ssh -t stevenv@$NODE3 "echo '$STEVENV_PASS' | sudo -S mysql << 'SQL'
STOP GROUP_REPLICATION;
SET GLOBAL group_replication_start_on_boot = OFF;
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
SET GLOBAL group_replication_group_seeds = '100.80.193.50:33061,100.99.21.39:33061,100.89.110.16:33061';
SET GLOBAL group_replication_recovery_retry_count = 10;
SET GLOBAL group_replication_recovery_reconnect_interval = 10;
CHANGE REPLICATION SOURCE TO SOURCE_USER='henil', SOURCE_PASSWORD='REDACTED' FOR CHANNEL 'group_replication_recovery';
START GROUP_REPLICATION;
SQL"
}

echo "******* Bootstrapping Node 1 (100.80.193.50) *******"
if [ "$LOCAL_IP" == "$NODE1" ]; then
    bootstrap_node1_local
else
    bootstrap_node1_remote
    if [ $? -ne 0 ]; then
        echo "[ERROR] Node 1 ($NODE1) failed to bootstrap. Aborting."
        exit 1
    fi
fi
echo "[OK] Node 1 bootstrapped."
sleep 7

echo "****** Joining Node 2 (100.99.21.39) ******"
if [ "$LOCAL_IP" == "$NODE2" ]; then
    join_node_local
else
    run_mysql_node2
    if [ $? -ne 0 ]; then
        echo "Retrying Node 2 with password fallback..."
        run_mysql_node2_fallback
        if [ $? -ne 0 ]; then
            echo "[ERROR] Node 2 ($NODE2) failed to join. Check /var/log/mysql/error.log on that node."
        fi
    fi
fi
sleep 10
check_node_status "Node 2 ($NODE2)" "$NODE2"

echo "******* Joining Node 3 (100.89.110.16) *********"
if [ "$LOCAL_IP" == "$NODE3" ]; then
    join_node_local
else
    run_mysql_node3
    if [ $? -ne 0 ]; then
        echo "Retrying Node 3 with password fallback..."
        run_mysql_node3_fallback
        if [ $? -ne 0 ]; then
            echo "[ERROR] Node 3 ($NODE3) failed to join. Check /var/log/mysql/error.log on that node."
        fi
    fi
fi
sleep 10
check_node_status "Node 3 ($NODE3)" "$NODE3"

echo "******* Setting Primary to $NODE1 *******"
if [ "$LOCAL_IP" == "$NODE1" ]; then
    sudo mysql -e "SELECT group_replication_set_as_primary('$NODE1:3306');"
else
    ssh vmware@$NODE1 "sudo mysql -e \"SELECT group_replication_set_as_primary('$NODE1:3306');\""
fi

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to set primary. Cluster may not have enough online nodes."
fi

sleep 3

echo "********* Cluster Status ***********"
sudo mysql -e "SELECT MEMBER_HOST, MEMBER_PORT, MEMBER_ROLE, MEMBER_STATE FROM performance_schema.replication_group_members;"
