#!/bin/bash

case "$1" in
    start)
        echo "Strarting Rabbit service..."
        sudo systemctl start rabbitmq-server
        ;;
    stop)
        echo "Stopping RabbitMQ service..."
        sudo systemctl stop rabbitmq-server
        ;;
    restart)
        echo "Restarting RabbitMQ service..."
        sudo systemctl restart rabbitmq-server
        ;;
    status) 
        echo "RabbitMQ server status."
        sudo systemctl status sabbitmq-server
        ;;
    enable)
        echo "Enabling RabbitMQ to start on boot..."
        sudo systemctl enable rabbitmq-server
        ;;
    disable)
        echo "Disabling RabbitMQ to start on boot.."
        sudo systemctl disable rabbitmq-server
        ;;
    plugin-enable)
        echo "Enabling management plugin..."
        sudo rabbitmq-plugins enable rabbit_management
        ;;
    *)
        echo "Usage: $0 (start|stop|restart|status|enable|disable|plugin-enable)"
        exit 1
        ;;
esac

exit 0