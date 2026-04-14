#!/bin/bash

echo "**************** Stopping Backend Workers ***********************"

pkill -f frontend.php 2>/dev/null
pkill -f dbridge.php 2>/dev/null

sleep 1

pkill -9 -f frontend.php 2>/dev/null
pkill -9 -f dbridge.php 2>/dev/null

sleep 1

echo "*************** Verifying all stopped ***************************"

if pgrep -f frontend.php > /dev/null; then
    echo "WARNING MSG: FrontendWorker still running"
else
    echo "FrontendWorker confirmed stopped"
fi

if pgrep -f dbridge.php > /dev/null; then
    echo "WARNING MSG: DBridgeWorker still running"
else
    echo "DBridgeWorker confirmed stopped"
fi

echo "***************** Backend Stopped *******************************"
