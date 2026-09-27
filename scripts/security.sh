#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/.env" ] && source "$SCRIPT_DIR/.env" || { echo "[ERROR] .env not found"; exit 1; }

JAIL_CONFIG="$SCRIPT_DIR/../infra/fail2ban/jail.local"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10"

# ── Colors ────────────────────────────────────────────────────────────────────
R='\033[0;31m'  G='\033[0;32m'  Y='\033[1;33m'
C='\033[0;36m'  B='\033[1m'     D='\033[2m'     RESET='\033[0m'

run()       { ssh -n $SSH_OPTS "$1@$2" "$3"; }
reachable() { run "$1" "$2" "echo ok" &>/dev/null; }

# ── Setup ─────────────────────────────────────────────────────────────────────
setup_node() {
    local label=$1 user=$2 host=$3

    printf "\n  ${B}%-28s${RESET}  ${D}%s${RESET}\n" "$label" "$host"

    if ! reachable "$user" "$host"; then
        printf "    ${R}✗ unreachable — skipping${RESET}\n"
        return
    fi

    if run "$user" "$host" "command -v fail2ban-server &>/dev/null"; then
        printf "    ${D}already installed${RESET}\n"
    else
        printf "    installing..."
        run "$user" "$host" "sudo apt-get update -qq && sudo apt-get install -y -qq fail2ban"
        printf "  ${G}done${RESET}\n"
    fi

    scp $SSH_OPTS "$JAIL_CONFIG" "$user@$host:/tmp/jail.local" &>/dev/null
    run "$user" "$host" "sudo mv /tmp/jail.local /etc/fail2ban/jail.local && sudo chown root:root /etc/fail2ban/jail.local"
    printf "    ${G}✓ jail.local deployed${RESET}\n"

    run "$user" "$host" "sudo systemctl enable fail2ban --quiet && sudo systemctl restart fail2ban"
    sleep 2

    local jails
    jails=$(run "$user" "$host" "sudo fail2ban-client status 2>/dev/null | grep 'Jail list' | sed 's/.*Jail list:[[:space:]]*//'") || jails="none"
    printf "    ${G}✓ active jails:${RESET} ${D}%s${RESET}\n" "$jails"
}

setup_all() {
    printf "\n${B}${C}  FAIL2BAN SETUP${RESET}\n"
    printf "${D}  ──────────────────────────────────────────────────────────${RESET}\n"
    printf "  ${D}Config:    %s${RESET}\n" "$JAIL_CONFIG"
    printf "  ${D}Whitelist: 100.64.0.0/10 (Tailscale — nodes won't ban each other)${RESET}\n"

    setup_node "LB Node  (nginx + PHP)" "$PHP_USER"      "$PHP_HOST"
    setup_node "Node1    (nginx)"        "$FRONTEND_USER" "$FRONTEND_HOST"
    setup_node "Node2    (nginx)"        "$MYSQL_USER"    "$MYSQL_HOST"

    printf "\n${D}  ──────────────────────────────────────────────────────────${RESET}\n"
    printf "  ${G}${B}Setup complete.${RESET}  Run ${C}$0 status${RESET} to monitor.\n\n"
}

# ── Status ────────────────────────────────────────────────────────────────────
status_all() {
    printf "\n${B}${C}  FAIL2BAN STATUS${RESET}\n"
    printf "${D}  ──────────────────────────────────────────────────────────${RESET}\n\n"

    for entry in \
        "LB Node|$PHP_USER|$PHP_HOST" \
        "Node1  |$FRONTEND_USER|$FRONTEND_HOST" \
        "Node2  |$MYSQL_USER|$MYSQL_HOST"
    do
        IFS='|' read -r label user host <<< "$entry"
        printf "  ${B}%-10s${RESET}  ${D}%s${RESET}\n" "$label" "$host"

        if ! reachable "$user" "$host"; then
            printf "    ${R}✗ unreachable${RESET}\n\n"
            continue
        fi

        # Collect structured data: JAIL:<name>:<failed>:<banned>:<total>
        local result
        result=$(run "$user" "$host" '
            command -v fail2ban-client &>/dev/null || { echo NOT_INSTALLED; exit; }
            sudo systemctl is-active --quiet fail2ban 2>/dev/null || { echo NOT_RUNNING; exit; }
            jails=$(sudo fail2ban-client status 2>/dev/null | grep "Jail list" | sed "s/.*Jail list:[[:space:]]*//" | tr "," "\n" | tr -d " ")
            for jail in $jails; do
                data=$(sudo fail2ban-client status "$jail" 2>/dev/null)
                failed=$(echo "$data" | grep "Currently failed" | awk "{print \$NF}")
                banned=$(echo "$data" | grep "Currently banned" | awk "{print \$NF}")
                total=$(echo  "$data" | grep "Total banned"     | awk "{print \$NF}")
                echo "JAIL:$jail:${failed:-0}:${banned:-0}:${total:-0}"
            done
        ' 2>/dev/null || echo "ERROR")

        case "$result" in
            NOT_INSTALLED) printf "    ${R}✗ not installed${RESET}\n\n";          continue ;;
            NOT_RUNNING)   printf "    ${Y}⚠ installed but not running${RESET}\n\n"; continue ;;
            ERROR|"")      printf "    ${R}✗ error reading status${RESET}\n\n";   continue ;;
        esac

        printf "    ${G}✓ running${RESET}\n\n"
        printf "    ${D}%-22s  %7s  %7s  %7s${RESET}\n" "jail" "failed" "banned" "total"
        printf "    ${D}%-22s  %7s  %7s  %7s${RESET}\n" "──────────────────────" "───────" "───────" "───────"

        while IFS=: read -r _ jail failed banned total; do
            [ -z "$jail" ] && continue
            if [ "${banned:-0}" -gt 0 ] 2>/dev/null; then
                printf "    %-22s  %7s  ${R}%7s${RESET}  %7s\n" "$jail" "${failed:-0}" "$banned" "${total:-0}"
            else
                printf "    %-22s  %7s  %7s  %7s\n" "$jail" "${failed:-0}" "${banned:-0}" "${total:-0}"
            fi
        done <<< "$(printf '%s\n' "$result" | grep '^JAIL:')"

        printf "\n"
    done

    printf "${D}  ──────────────────────────────────────────────────────────${RESET}\n"
    printf "  ${D}Tip: ${C}$0 unban <IP>${RESET}${D} removes a ban from all nodes.${RESET}\n\n"
}

# ── Unban ─────────────────────────────────────────────────────────────────────
unban() {
    local ip=$1
    printf "\n${B}${C}  UNBANNING %s${RESET}\n" "$ip"
    printf "${D}  ──────────────────────────────────────────────────────────${RESET}\n\n"

    for entry in \
        "LB Node|$PHP_USER|$PHP_HOST" \
        "Node1  |$FRONTEND_USER|$FRONTEND_HOST" \
        "Node2  |$MYSQL_USER|$MYSQL_HOST"
    do
        IFS='|' read -r label user host <<< "$entry"
        printf "  ${B}%s${RESET}  ${D}%s${RESET}  " "$label" "$host"
        run "$user" "$host" "
            for jail in sshd nginx-http-auth nginx-botsearch nginx-limit-req; do
                sudo fail2ban-client set \$jail unbanip $ip 2>/dev/null || true
            done
        " && printf "${G}✓ unbanned${RESET}\n" || printf "${R}✗ error${RESET}\n"
    done

    printf "\n"
}

# ── Entry ─────────────────────────────────────────────────────────────────────
case "${1:-help}" in
    setup)  setup_all ;;
    status) status_all ;;
    unban)
        [ -z "${2:-}" ] && { printf "${R}Usage: $0 unban <IP>${RESET}\n"; exit 1; }
        unban "$2" ;;
    *)
        printf "\n${B}${C}  SECURITY.SH${RESET}\n\n"
        printf "  ${C}setup${RESET}         deploy fail2ban config to all nodes\n"
        printf "  ${C}status${RESET}        show active jails and banned IPs\n"
        printf "  ${C}unban ${D}<IP>${RESET}    remove a ban from all nodes\n\n"
        ;;
esac
