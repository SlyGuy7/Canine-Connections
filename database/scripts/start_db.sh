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

# schema.sql drops and recreates every table, so it is only loaded on a fresh server.
if sudo mysql -N -e "SHOW DATABASES LIKE 'adoption_center'" | grep -q adoption_center; then
    echo "Database adoption_center already exists — not reloading the schema (that would erase all data)."
else
    echo "Loading database schema..."
    sudo mysql < "$(dirname "${BASH_SOURCE[0]}")/../sql/schema.sql"
    echo "Database schema loaded."
fi

echo "Verifying tables..."

sudo mysql -e "USE adoption_center; SHOW TABLES;"