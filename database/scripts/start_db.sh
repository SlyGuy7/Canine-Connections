 #!/bin/bash
 #MySQL start script for database

 SERVICE_NAME=mysql

 if systemctl status $SERVICE_NAME | grep "Active: active" > /dev/null 2>&1; then
     echo "MySQL is already running."
 else
     echo "Starting MySQL server..."
     sudo systemctl start $SERVICE_NAME

     sleep 5

 if systemctl status $SERVICE_NAME | grep "Active: active" > /dev/null 2>&1; then
     echo "MySQL server started successfully."
 else
     echo "Failed to start MySQL server."
     exit 1
   fi
 fi

echo "Loading database schema..."

sudo mysql < "$(dirname "${BASH_SOURCE[0]}")/../sql/schema.sql"

echo "Database schema loaded."

echo "Verifying tables..."

sudo mysql -e "USE adoption_center; SHOW TABLES;"