#!/bin/bash
# Creates (or updates) the restricted RabbitMQ user the browser logs in with over STOMP.
# Run once on any RabbitMQ node; users and permissions replicate across the cluster.
#
# Usage: sudo ./setup_web_user.sh [username]     (default username: canine_web)
#
# The web user can only:
#   - publish to the canine.requests exchange (bound to the request.* queues by the backend)
#   - declare and read its own reply.* queues
# It cannot publish to the default exchange, so it cannot reach the internal bridge.* / db.* queues.
#
# Afterwards, put the same username/password in frontend/.env (VITE_MQ_LOGIN / VITE_MQ_PASSCODE),
# rebuild the frontend, and change the admin password, which was previously shipped to browsers.
set -euo pipefail

WEB_USER="${1:-canine_web}"
VHOST="/"

read -rsp "Password for RabbitMQ user '$WEB_USER': " WEB_PASS; echo
[ -n "$WEB_PASS" ] || { echo "Password cannot be empty"; exit 1; }

if rabbitmqctl list_users --silent | awk '{print $1}' | grep -qx "$WEB_USER"; then
    rabbitmqctl change_password "$WEB_USER" "$WEB_PASS"
    echo "Updated password for $WEB_USER"
else
    rabbitmqctl add_user "$WEB_USER" "$WEB_PASS"
    echo "Created $WEB_USER"
fi

# No management UI access.
rabbitmqctl set_user_tags "$WEB_USER"

# configure / write / read
rabbitmqctl set_permissions -p "$VHOST" "$WEB_USER" '^reply\..*' '^canine\.requests$' '^reply\..*'

echo
echo "Permissions for $WEB_USER:"
rabbitmqctl list_user_permissions "$WEB_USER"
