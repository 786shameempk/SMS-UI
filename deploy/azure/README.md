# Deploying SMS to an Azure Linux VM

One VM runs everything with Docker Compose: the UI and 7 .NET services from GHCR, SQL Server, Redis and
Caddy, which is the only public entry point and handles HTTPS.

LiveKit (in-app video classes + recording) is **not deployed yet**. MeetingService still runs and
external-link meetings (Zoom/Meet/Teams URLs) work; in-app video classes won't connect until LiveKit is added.

```
Browser ──443──> Caddy ─┬─ /            -> ui
                        ├─ /services/*  -> apigateway -> auth / academic / finance / campus / engagement / meeting
                        └─ /api/*       -> apigateway (reports)
```

## 1. VM

- Ubuntu 24.04 LTS, x86_64 (SQL Server has no ARM image).
- Size: at least **4 vCPU / 8 GB** (e.g. `Standard_B4ms` or `D2s_v5` with 8 GB for a small start).
  SQL Server wants 2 GB+ and each .NET service ~200-300 MB.
- A static public IP.
- Network security group, inbound: `22/tcp` (your IP only), `80/tcp`, `443/tcp`, `443/udp`.
  Do **not** open 1433 or 6379.

## 2. DNS

An A record for your domain (e.g. `app.example.com`) pointing at the VM's public IP. It must resolve
before the first start, or Caddy can't get a certificate.

## 3. Build the images

The 7 service repos already publish to `ghcr.io/786shameempk/<service>` on every push to `master`.

The UI bakes its API URLs in at build time, so in the **SMS-UI** GitHub repo set the Actions variable
`PUBLIC_URL` (Settings > Secrets and variables > Actions > Variables), e.g. `https://app.example.com`, then
push to `master` (or run the "Docker image (GHCR)" workflow by hand) to publish `ghcr.io/786shameempk/sms-ui`.

## 4. Install Docker on the VM

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in
```

## 5. Configure and start

Copy this folder (`docker-compose.yml`, `Caddyfile`, `.env.example`) to the VM, e.g. `~/sms`:

```bash
scp -r deploy/azure azureuser@<vm-ip>:~/sms
```

On the VM:

```bash
cd ~/sms
cp .env.example .env && chmod 600 .env
nano .env                        # fill in every value (openssl rand -base64 48 for secrets, incl. LIVEKIT_API_SECRET)
docker login ghcr.io             # GitHub username + a PAT with read:packages
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f caddy     # watch the certificates being issued
```

The services create and migrate their databases on first start.

## Updating

```bash
docker compose pull && docker compose up -d
docker image prune -f
```

Pin `IMAGE_TAG` / `UI_IMAGE_TAG` in `.env` to a `sha-xxxxxxx` tag to deploy or roll back an exact build.

## Backups

Everything stateful is in named volumes: `sqlserver-data`, `redis-data`, `study-materials`, `talent-media`,
`meeting-files` (recordings + the meeting encryption key ring) and `caddy-data` (certificates).
At minimum, back up the databases regularly, for example:

```bash
docker compose exec sqlserver mkdir -p /var/opt/mssql/backup
docker compose exec sqlserver sh -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "BACKUP DATABASE AuthServiceDb TO DISK='"'"'/var/opt/mssql/backup/AuthServiceDb.bak'"'"' WITH INIT"'
```

(repeat per database, then copy the `.bak` files off the VM, e.g. to Azure Blob Storage), and enable
Azure Backup / disk snapshots for the VM.

## Notes

- SQL Server runs as **Express** (free, 10 GB per database). The Developer edition is not licensed for
  production; set `MSSQL_PID=Standard` only if you have a licence.
