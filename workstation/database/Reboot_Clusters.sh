#!/bin/bash

echo "******** Booting MySQL Clusters ********"

echo "******* Bootstrapping Node 1 *******"
sudo mysql << 'SQL'
SET GLOBAL group_replication_ip_allowlist = "100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1";
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;
SQL

sleep 7

echo "****** Joining Node 2 ******"
ssh deryk@100.99.21.39 "sudo mysql -e \"
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
START GROUP_REPLICATION;
\""

sleep 7

echo "******* Joining Node 3 *********"
ssh stevenv@100.89.110.16 "sudo mysql -e \"
RESET MASTER;
SET GLOBAL group_replication_ip_allowlist = '100.80.193.50,100.99.21.39,100.89.110.16,127.0.0.1';
START GROUP_REPLICATION;
\""

sleep 5

echo "********* Cluster's Status ***********"
sudo mysql -e "SELECT MEMBER_HOST, MEMBER_PORT, MEMBER_STATE FROM performance_schema.replication_group_members;"
