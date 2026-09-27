# 🐾 Canine Connections

> **Find your new best friend.**

Canine Connections is a full-stack dog adoption platform that connects prospective adopters with rescue dogs from partner shelters across the network. Users can browse available dogs, take a compatibility quiz to find their ideal match, submit adoption applications, message shelters directly, and track their journey in a personal journal — all for free.

**🌐 Live site:** https://canineconnections.org

---

## 🐶 What the Site Does

### For Adopters
- **Browse Dogs** — Search available dogs filtered by size (small, large, puppy), breed, age, and compatibility traits (good with kids, good with cats, apartment-friendly)
- **Dog Profiles** — Full profile pages with photos, age, size, gender, temperament tags, and shelter info
- **Compatibility Quiz** — Answer a set of lifestyle questions and get matched with dogs that suit your home and habits
- **Adoption Applications** — Submit an online application directly through the platform; track status in real time
- **Saved Dogs** — Bookmark dogs you're interested in to revisit later
- **Messages** — In-app messaging between adopters and shelters
- **Journal** — A personal adoption journal to document your journey
- **Resources** — Curated articles on training, nutrition, health, and behavior

### For Shelter Admins
- **Manage Dogs** — Add, edit, and remove dog listings with photos and full profiles
- **Review Applications** — View and respond to incoming adoption applications
- **Manage Users** — Admin panel for user account management

### For Everyone
- **Email Verification** — Accounts require email verification before login
- **Forgot Password / Reset** — Full password reset flow via email
- **Login Notifications** — Optional email alert when your account is accessed

---

## 🛡️ Security Features

### Brute-Force Protection (Fail2Ban + nginx-deny)
Login attempts are processed exclusively on the load balancer. Failed attempts are logged and monitored by **Fail2Ban**. After **5 failed attempts**, the client IP is banned for **1 hour** via an nginx `deny` rule.

- Works with Cloudflare Tunnel (iptables-based bans don't — nginx-deny does)
- Real client IP is extracted from the `CF-Connecting-IP` header
- Users see a live countdown timer on the login page when locked out, which persists across page refreshes

```
❌ Invalid password. 4 attempts remaining.
❌ Invalid password. 3 attempts remaining.
...
🔒 Locked out — 59:47 remaining
```

### Cloudflare Pseudo IPv4
Cloudflare's **Pseudo IPv4 (Overwrite Headers)** maps IPv6 client addresses to a consistent address in the `240.0.0.0/4` reserved range. This ensures Fail2Ban bans work uniformly regardless of how clients connect.

### Two-Factor ID Verification (Dexter's Law)
During registration, users must upload two forms of photo ID (e.g. driver's licence + passport). This complies with Dexter's Law animal protection requirements.

---

## 🏗️ Architecture

```
[Cloudflare Edge]
       │  HTTPS / WSS
       ▼
┌─────────────────────────────────┐
│  Load Balancer  100.99.21.39    │  ← Always active
│  nginx · cloudflared            │
│  PHP workers · MySQL (primary)  │
│  Fail2Ban · canine-frontend     │
└────────────┬────────────────────┘
             │
     ┌───────┴────────┐
     ▼                ▼
Node 1            Node 2
100.89.110.16     100.80.193.50
(Standby)         (Standby)

[RabbitMQ — 100.87.19.28]  ← Message broker
```

### Active-Passive Failover
Node 1 and Node 2 run a watchdog service that polls `/canine-health` on the load balancer every 10 seconds. If the LB is unreachable for 3 consecutive checks, the node automatically activates itself (starts cloudflared + all PHP workers). When the LB recovers, the node steps back down to standby with no manual intervention needed.

### Real-Time Messaging
All frontend-to-backend communication uses **RabbitMQ STOMP over WebSocket** (`wss://canineconnections.org/ws`). There is no REST API — every action (login, browse dogs, submit application, send message) is a message published to a queue and handled by a PHP worker.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router |
| Real-time | RabbitMQ STOMP over WebSocket |
| Backend Workers | PHP 8 (FrontendWorker, DB Worker, Bridge) |
| Database | MySQL 8 |
| Web Server | nginx |
| Tunnel / CDN | Cloudflare Tunnel |
| Brute-force protection | Fail2Ban + nginx-deny |
| Email | PHPMailer (verification, password reset, login alerts) |
| Deployment | Bash — zero-downtime rolling deploy |

---

## 👥 Team

| Member | Role |
|--------|------|
| Steven Vernikov | Frontend (React, UI/UX, deployment) |
| Henil | Database (MySQL schema, migrations) |
| Derrick | Backend – Frontend Worker (auth, PHP) |
| Abi | Backend – DB Worker (queries, data layer) |
| Mike | RabbitMQ / Message Broker infrastructure |

---

## 📁 Project Structure

```
Canine-Connections/
├── frontend/                  # React + Vite app (npm install / npm run dev)
│   ├── src/
│   │   ├── pages/             # One component per route (Landing, Dashboard, Admin*, ...)
│   │   ├── components/        # Shared UI (Layout, Sidebar, AuthModal, guards)
│   │   ├── context/           # Toast + data-cache providers
│   │   ├── hooks/
│   │   └── services/          # messaging.js (RabbitMQ STOMP client), api.js
│   ├── public/
│   └── vite.config.js
│
├── backend/                   # PHP workers (composer install)
│   ├── frontend.php           # Entry point → canine-frontend service
│   ├── dbridge.php            # Entry point → canine-dbridge service
│   ├── notification_worker.php
│   ├── src/                   # App\ namespace: Workers, Services, Http, Security, ...
│   ├── public/                # HTTP entry (php -S ... -t public)
│   ├── start_backend.sh / stop_backend.sh
│   └── .env.example
│
├── database/                  # MySQL + DB worker (composer install)
│   ├── db_worker.php          # Entry point → canine-db-worker service
│   ├── sql/                   # schema.sql, seeds, resource seed + patch
│   └── scripts/               # start_db.sh, Reboot_Clusters.sh, start_db_worker_if_primary.sh
│
├── infra/                     # Server config files
│   ├── nginx/                 # Load balancer site config
│   ├── fail2ban/              # jail.local + canine-auth jail
│   └── rabbitmq/              # rabbitmq.conf, send.py smoke test
│
├── scripts/                   # Ops tooling
│   ├── deploy.sh              # Zero-downtime deployment
│   ├── deploy.json            # Tracks currently active node
│   ├── setup_services.sh      # Installs systemd services for a VM's role
│   ├── dev.sh                 # Remote dev environment / tunnels
│   ├── security.sh            # Fail2Ban rollout + status
│   ├── rejoin_rabbitmq.sh
│   └── importers/             # RescueGroups / Dog API import + shelter sync
│
└── .github/workflows/ci.yml   # Lint + build the frontend
```

---

## 🚀 Deployment

```bash
./scripts/deploy.sh
```

Zero-downtime rolling deploy:
1. Pull latest from `main`
2. Build the React frontend (`frontend/`, `npm run build`)
3. Drain traffic from the inactive node
4. Deploy to inactive node
5. Switch traffic to newly updated node
6. Deploy to previously active node
7. Re-enable both nodes
8. Push build to the load balancer and restart backend workers
9. Commit the updated `scripts/deploy.json` (records new active node)

### Setting up a VM's services

```bash
./scripts/setup_services.sh frontend   # or: dbridge | db
```

Runs `composer install` for the right component and (re)writes the systemd unit with the correct paths.

### Configuration / secrets

No credentials are committed. Each component reads a gitignored env file; copy the template and fill it in on each machine:

| Template | Copy to | Used by |
|---|---|---|
| `frontend/.env.example` | `frontend/.env` | Vite build (STOMP login) |
| `backend/.env.example` | `backend/.env` | PHP workers |
| `database/.env.example` | `database/.env` | `db_worker.php`, cluster scripts |
| `scripts/.env.example` | `scripts/.env` | `dev.sh`, `security.sh`, `rejoin_rabbitmq.sh` |
| `scripts/importers/.env.import.example` | `scripts/importers/.env.import` | Importers |

---

## 💻 Local Development

```bash
cd frontend
cp .env.example .env   # then fill in VITE_MQ_LOGIN / VITE_MQ_PASSCODE
npm install
npm run dev
```

The Vite dev server proxies `/ws`, `/client-ip`, and API calls to the live load balancer via `vite.config.js`. No local RabbitMQ or PHP setup needed.

---

## 🔧 Admin Utilities

```bash
canine-banned        # Show currently banned IPs (queries LB Fail2Ban jail)
```
