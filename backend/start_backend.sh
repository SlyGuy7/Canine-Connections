#!/bin/bash

echo "******** Stopping any existing workers ***************"
pkill -9 -f frontend.php 2>/dev/null
pkill -9 -f dbridge.php 2>/dev/null
sleep 5

echo "******** Starting Backend Workers ********************"

cd "$(dirname "${BASH_SOURCE[0]}")"

php frontend.php > /tmp/frontend.log 2>&1 &
echo "FrontendWorker started (PID: $!)"

php dbridge.php > /tmp/dbridge.log 2>&1 &
echo "DBridgeWorker started (PID: $!)"

sleep 5

echo ""
echo "************ Backend Up and Running ******************"
echo ""
echo "************ CHECKING IF PHP PROCESSES IS RUNNING ****"
ps aux | grep php | grep -v grep
echo "******************************************************"
echo ""
echo "******************************************************"
echo " EXECUTE THESE CMD'S TO WATCH LIVE LOGS in real time:"
echo ""
echo "  FrontendWorker:"
echo "    tail -f /tmp/frontend.log"
echo ""
echo "  DBridgeWorker:"
echo "    tail -f /tmp/dbridge.log"
echo ""
echo "  Both at once:"
echo "    tail -f /tmp/frontend.log /tmp/dbridge.log"
echo ""
echo " CMD To stop all workers:"
echo "    ./stop_backend.sh"
echo "*******************************************************"
