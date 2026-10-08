# Deploying SMS to an Azure Linux VM

One VM runs everything with Docker Compose: the UI and 8 .NET services from GHCR, Redis,
LiveKit + Egress (in-app video classes and recordings) and Caddy, which handles HTTPS. The databases are on
Azure SQL (`AZURE_SQL_SERVER` in `.env`); create the seven service databases there first and allow the VM through the server firewall.

```
Browser ──443──> Caddy ─┬─ /            -> ui
                        ├─ /services/*  -> apigateway -> auth / academic / finance / campus / engagement / meeting / ai
                        ├─ /api/*       -> apigateway (reports)
                        └─ /livekit/*   -> livekit (video signalling, WebSocket)

Browser ── 7882/udp, 7881/tcp, 3478/udp (TURN) ──> livekit   (video and audio media, direct)
livekit ── Redis ──> egress (records a class to MP4 in meeting-files) ──> meetingservice uploads it to blob storage
```

## 1. VM

- Ubuntu 24.04 LTS, x86_64 (SQL Server has no ARM image).
- Size: at least **4 vCPU / 8 GB** (e.g. `Standard_B4ms` or `D2s_v5` with 8 GB for a small start).
  SQL Server wants 2 GB+ and each .NET service ~200-300 MB. Recording classes adds about 2-4 vCPU per
  recording in progress, so for regular recordings use **8 vCPU / 16 GB** (e.g. `D4s_v5`), or set
  `LIVEKIT_EGRESS_ENABLED=false` to run live classes without recording.
- A static public IP (LiveKit advertises it to browsers for media).
- Network security group, inbound: `22/tcp` (your IP only), `80/tcp`, `443/tcp`, `443/udp`, and for video
  `7881/tcp`, `7882/udp`, `3478/udp`. Do **not** open 1433, 6379 or 7880.

## 2. DNS

An A record for your domain (e.g. `app.example.com`) pointing at the VM's public IP. It must resolve
before the first start, or Caddy can't get a certificate.

More domains on the same VM: add an A record for each to the same IP, list them in `.env` as
`EXTRA_DOMAINS` (space-separated), then `docker compose up -d caddy`. Caddy gets a certificate for each and
redirects them to `DOMAIN`.

### School subdomains (multi-tenant)

Each school opens the one shared app at `{subdomain}.sms-schoolsphere.com` (e.g. `greenvalley.sms-schoolsphere.com`);
the school is identified from the hostname, so there is no school picker and no per-school build.

1. Add one wildcard A record: `*.sms-schoolsphere.com` -> the VM's public IP (the explicit records for `DOMAIN`,
   `www` and `APP_DOMAIN` keep working; more specific names win).
2. `TENANT_BASE_DOMAIN` in `.env` (default `sms-schoolsphere.com`) is the suffix schools live under.
3. HTTPS: Caddy issues a certificate for a school's host on its first visit (on-demand TLS, plain HTTP-01, no DNS plugin),
   but only after AuthService confirms the subdomain belongs to a live tenant (`GET /api/tenant/domain-check`), so unknown
   names get no certificate. Let's Encrypt rate limits apply (50 new certificates per week per registered domain); if you
   expect to onboard more schools than that, switch to a wildcard certificate via a DNS-challenge Caddy build.
4. `PLATFORM_SUBDOMAINS` (default `www,demo`) lists hosts that are the platform itself, not a school: no tenant lookup and
   any account (including the Super Admin) can sign in there. `APP_DOMAIN`'s subdomain (`demo`) belongs in this list until
   you create a tenant with that subdomain; then remove it so `demo.sms-schoolsphere.com` becomes that school.
5. Create the school in Platform Console -> Tenants -> New tenant: enter only the subdomain, the full address is generated.
   Subdomains are unique, lowercase letters/digits/hyphens, and `www`, `api`, `admin` and other platform names are reserved.
6. On a school host, only that school's users can sign in (checked on the server; a mismatch looks like a wrong password),
   and the API is called on the same host (`/services/*`), so no extra CORS setup is needed.
7. Each school sets its logo, name, email and contact number in Settings -> School Profile. Anything it leaves empty falls
   back to School Sphere's logo/name, and an empty email/contact number is simply not shown.

## 3. Build the images

The 8 service repos already publish to `ghcr.io/786shameempk/<service>` on every push to `master`.

The UI bakes its API URLs in at build time, so in the **SMS-UI** GitHub repo set the Actions variable
`PUBLIC_URL` (Settings > Secrets and variables > Actions > Variables), e.g. `https://app.example.com`, then
push to `master` (or run the "Docker image (GHCR)" workflow by hand) to publish `ghcr.io/786shameempk/sms-ui`.

## 4. Install Docker on the VM

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in
```

## 5. File storage (Azure Blob Storage)

Every uploaded file lives in one storage account: study materials, Talent Showcase media, meeting materials and
recordings, student/staff photos and documents, and user avatars. The services create their private containers
(`study-materials`, `talent-media`, `meeting-files`, `people-files`, `user-files`, `ai-documents`) on first use and serve files only
through their own short-lived signed links, so the containers never need public access or CORS.

Create the account once (same region as the VM), e.g. with the Azure CLI:

```bash
az storage account create -g <resource-group> -n <uniquename> -l <region> \
  --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false
az storage account show-connection-string -g <resource-group> -n <uniquename> -o tsv
```

Put that connection string in `.env` as `AZURE_STORAGE_CONNECTION_STRING`. Recommended in the portal: Data protection →
enable soft delete for blobs (e.g. 30 days) and versioning, so a deleted file can be restored.

**Moving an existing install:** set the connection string and restart. On start each service copies its old files
into blob storage under the same keys (photos/documents/avatars that were stored inside the database are moved too)
and logs e.g. `Study materials: copied N local files to blob storage`. Old files are left in the volumes; once you've
checked everything opens, the `study-materials` and `talent-media` volumes can be removed. Keep `meeting-files`: LiveKit
Egress drops recordings there before they're uploaded, and it holds the key ring that decrypts stored meeting links.

## 5b. AI (AiService)

AiService runs the AI assistant, teacher generators, study-material Q&A, report-card remarks and exam/progress
insights. It publishes to `ghcr.io/786shameempk/aiservice` like the other services and is reached through the
gateway at `/services/ai/*`; the UI is pointed there at start-up (`AI_API_URL`).

Set these in `.env` (see `.env.example`):

- `AI_PROVIDER`: `OpenAI`, `Anthropic` or `AzureOpenAI`, plus that provider's key (`OPENAI_API_KEY`, ...). The key
  stays on the VM: it never reaches the browser and is never stored in `appsettings.json`. With the default `Mock`
  the service starts without a key, but the generators, remarks and insights refuse to run.
- `AI_EMBEDDINGS_PROVIDER`: `OpenAI` or `AzureOpenAI` for real study-material search (`Mock` is keyword-only).
- `AI_DAILY_REQUESTS_PER_USER` / `AI_MONTHLY_TOKENS_PER_SCHOOL`: usage limits. Admins see usage in AI Features > AI Usage.

Its database (`AiServiceDb`) and background-job tables are created on first start. Uploaded study materials go to the
`ai-documents` blob container.

Who sees AI Features is decided by AuthService (role defaults, the school's plan and Roles & Permissions), not here.

## 6. Configure and start

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

Uploaded files are in Azure Blob Storage (see section 5; turn on soft delete and versioning there). On the VM, the
stateful volumes are `redis-data`, `meeting-files` (the meeting encryption key ring, and
recordings until they're uploaded) and `caddy-data` (certificates).
Databases are on Azure SQL, which has automatic backups with point-in-time restore (check the retention setting on the
server). Enable Azure Backup / disk snapshots for the VM as well.

## Notes

