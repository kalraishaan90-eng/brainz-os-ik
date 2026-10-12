# Eduvia — Institutional On-Premises Deployment Guide

> **Official Systems Administration & IT Operations Manual**  
> *Target Environments: Ubuntu Linux Server (22.04/24.04 LTS) or Windows Server / Docker Desktop*

---

## 1. System Architecture & Zero-Cloud Principles

Eduvia runs entirely on hardware owned and controlled by the institution.
- **Zero Third-Party Cloud Dependencies**: All services (PostgreSQL, Auth, REST, Realtime, Document Storage, and Web Shell) run in local Docker containers.
- **Data Residency**: Student records, grades, biometric IDs, and attendance logs reside strictly on local disk volumes under `./volumes/db/data` and `./volumes/storage`.
- **Zero External Network Calls**: All JavaScript libraries (Supabase JS, Lucide icons) and typography (Newsreader, Plus Jakarta Sans) are vendored on-premises. No telemetry or analytics exist.

---

## 2. Server Hardware & Operating System Requirements

### Recommended Hardware
| Component | Minimum Specification | Recommended (500+ Students) |
| :--- | :--- | :--- |
| **CPU** | 4 Cores (x86_64) | 8 Cores |
| **RAM** | 8 GB ECC RAM | 16 GB ECC RAM |
| **Storage** | 100 GB NVMe / SATA SSD | 500 GB NVMe (RAID-1 mirror recommended) |
| **Network** | 1 Gbps Ethernet NIC | 1 Gbps Dedicated Institutional LAN |

### Supported Operating Systems
- **Linux (Recommended)**: Ubuntu Server 22.04 LTS / 24.04 LTS, Debian 12
- **Windows**: Windows 10/11 Pro / Enterprise or Windows Server 2022 with Docker Desktop (WSL2 backend)

---

## 3. Step-by-Step Installation

### Step A: Install Docker & Docker Compose
#### On Ubuntu Server:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### On Windows:
1. Download and install **Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/).
2. Enable WSL2 and reboot if prompted.
3. Start Docker Desktop and ensure it is running in Linux containers mode.

---

### Step B: Provision Storage Directories & Permissions
```bash
cd /opt/Eduvia   # Or your target directory

# Create physical storage mount directories on school disk
mkdir -p volumes/db/data
mkdir -p volumes/storage
mkdir -p backups

# On Linux, assign permissions for PostgreSQL (UID 999)
sudo chown -R 999:999 volumes/db
```

---

### Step C: Generate Cryptographic Secrets
Never use default development passwords. Run the automated key generator:
```bash
# Generate fresh database password, JWT secret, anon key, and service_role key
node scripts/generate-keys.js --write
```
Verify that `.env` is created. Adjust `APP_PORT` (default 80) and `SITE_URL` (e.g., `http://192.168.1.50` or `http://eduvia.school.internal`).

---

### Step D: Launch the Institutional Stack
```bash
# Pull images and start the full suite in the background
docker compose up -d

# Verify all 8 containers are healthy
docker compose ps
```
Services initialized:
1. `eduvia-db`: PostgreSQL 15 with migrations loaded automatically.
2. `eduvia-kong`: API Gateway on port 8000 (internal).
3. `eduvia-auth`: GoTrue identity provider (internal port 9999).
4. `eduvia-rest`: PostgREST database engine (internal port 3000).
5. `eduvia-realtime`: WebSockets pub/sub (internal port 4000).
6. `eduvia-storage`: Local filesystem object storage (internal port 5000).
7. `eduvia-functions`: Edge runtime for teacher provisioning.
8. `eduvia-web`: Nginx serving static assets and reverse proxying to Kong.

---

### Step E: One-Time Director Account Bootstrap
Run the CLI bootstrap utility to provision the executive administrator:
```bash
node scripts/bootstrap-director.js --email director@school.edu --password "YourStrongDirectorPassword123!"
```
*Note: This script enforces single-director initialization. Once a director exists in the database, the script permanently locks itself.*

---

## 4. Network Setup & School Intranet Routing

### LAN Access (Default)
By default, the application is accessible on the school local network:
- Access via IP: `http://192.168.1.50` (replace with your server's static IP).
- Access via Local Hostname: Add an entry in the school DNS router or local DNS server (e.g. Pi-hole / pfSense / Windows Server DNS):
  ```
  192.168.1.50   eduvia.school.internal
  ```

### Firewall Rules (Strict Defense)
- **ALLOW INBOUND on Port 80 / 443**: Only from institutional LAN subnets (e.g., `192.168.1.0/24`).
- **BLOCK INBOUND on Port 5432 & 8000**: Never expose PostgreSQL or Kong directly to external networks.
- **BLOCK PORT FORWARDING TO WAN**: Do not expose port 80/443 to the public internet without an encrypted VPN gateway.

### Remote Access Policy (VPN vs. Opening Ports)
> [!IMPORTANT]
> **DO NOT port-forward Eduvia to the public internet.**
> Eduvia processes sensitive student records and academic marks. For staff or students accessing from home, deploy a dedicated VPN:
> - **Tailscale** (e.g. install on the server and authorized staff laptops; zero firewall holes).
> - **WireGuard / OpenVPN** terminating at the school's edge router.

---

## 5. Automated Backups & Disaster Recovery

### Automated Nightly Backups
Eduvia includes an automated `pg_dump` snapshot script with atomic SHA-256 verification and 14-day retention.

#### On Linux: Schedule via Cron
Add to the root crontab (`sudo crontab -e`):
```cron
0 2 * * * /opt/Eduvia/scripts/backup-db.sh >> /var/log/eduvia-backup.log 2>&1
```

#### On Windows: Schedule via Task Scheduler
Create a Basic Task running daily at 2:00 AM:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Eduvia\scripts\backup-db.ps1
```

### One-Command Restoration
To restore a snapshot into the database:
```bash
# Linux:
./scripts/restore-db.sh /opt/Eduvia/backups/eduvia_backup_20261001_020000.dump

# Windows:
powershell -File scripts/restore-db.ps1 -DumpPath "C:\Eduvia\backups\eduvia_backup_20261001_020000.dump"
```

---

## 6. Key Rotation Procedure

If administrative credentials or JWT secrets need to be rotated:
1. Generate new keys using `node scripts/generate-keys.js`.
2. Update the `.env` file with the new `JWT_SECRET`, `ANON_KEY`, and `SERVICE_ROLE_KEY`.
3. Recreate the containers:
   ```bash
   docker compose down
   docker compose up -d
   ```
4. Existing user passwords in PostgreSQL remain unaffected; only active JWT login sessions will expire, requiring users to log in again.

---

## 7. Regulatory Compliance & Data Hygiene (India DPDP Act 2023)

- **Minors' Data Protection**: Under India's Digital Personal Data Protection (DPDP) Act 2023, data belonging to individuals under 18 years of age requires verifiable parental or lawful guardian consent. The school administration must maintain signed consent agreements before enrolling students.
- **Physical Server Security**: Because all data lives on the school's own premises, the physical server room must be kept locked with monitored access.
- **OS Patching**: The host operating system (Ubuntu / Windows) must receive regular security updates (`sudo apt update && sudo apt upgrade`).
