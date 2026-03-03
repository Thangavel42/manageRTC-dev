# ManageRTC — Acceptance Environment Deployment Guide

**Platform:** ManageRTC HRMS
**Target Environments:** DEV (`dev.manage-rtc.com`) + ACC (`acc.manage-rtc.com`)
**Server:** Hostinger VPS (`31.97.229.42`)
**Date:** February 18, 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution: Repository Variables](#2-solution-repository-variables)
3. [Target Architecture](#3-target-architecture)
4. [Step 1 — Cloudflare DNS](#4-step-1--cloudflare-dns)
5. [Step 2 — Server Setup (one-time)](#5-step-2--server-setup-one-time)
6. [Step 3 — Nginx Configuration for ACC](#6-step-3--nginx-configuration-for-acc)
7. [Step 4 — GitHub Repository Variables](#7-step-4--github-repository-variables)
8. [Step 5 — GitHub Repository Secrets](#8-step-5--github-repository-secrets)
9. [Step 6 — How the Workflows Use Variables](#9-step-6--how-the-workflows-use-variables)
10. [Environment Variable Differences](#10-environment-variable-differences)
11. [Merge / Sync Safety](#11-merge--sync-safety)
12. [Verification Checklist](#12-verification-checklist)
13. [Rollback](#13-rollback)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Problem Statement

The project has two GitHub repositories on the same VPS:

| Repo | Environment | Frontend | Backend |
|------|-------------|----------|---------|
| `manageRTC-dev` | DEV | `dev.manage-rtc.com` | `apidev.manage-rtc.com` |
| `manageRTC-acc` (fork) | ACC | `acc.manage-rtc.com` | `apiacc.manage-rtc.com` |

**Goals:**
- ACC repo deploys to ACC environment, DEV repo deploys to DEV — never crossing.
- Syncing / merging between repos must never break either environment.
- No hardcoded paths inside the workflow files.

---

## 2. Solution: Repository Variables

GitHub provides two per-repo stores:

| Store | Syntax | Visible in logs | Use for |
|-------|--------|-----------------|---------|
| **Repository Variables** | `${{ vars.X }}` | Yes | Non-sensitive config (paths, URLs, names) |
| **Repository Secrets** | `${{ secrets.X }}` | No (masked) | Passwords, API keys, tokens |

**Approach:** All environment-specific paths and URLs are stored as **Repository Variables**. The workflow files are **identical** in both repos — they contain no hardcoded paths and no repo-detection logic. Each repo simply has different variable values.

When you merge/sync from DEV → ACC or ACC → DEV, the workflow files are identical and continue to work because they read from variables, not from hardcoded values in the file itself.

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLOUDFLARE                                  │
│                                                                      │
│  dev.manage-rtc.com    apidev.manage-rtc.com   (existing)           │
│  acc.manage-rtc.com    apiacc.manage-rtc.com   ← NEW DNS records    │
│  (all A records → 31.97.229.42, proxied)                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   HOSTINGER VPS (31.97.229.42)                       │
│                                                                      │
│  ┌──────────────────────────── NGINX ──────────────────────────────┐ │
│  │  dev.manage-rtc.com  → /var/www/dev.manage-rtc.com/frontend/   │ │
│  │  acc.manage-rtc.com  → /var/www/acc.manage-rtc.com/frontend/   │ │
│  │  apidev.manage-rtc.com → 127.0.0.1:5000                        │ │
│  │  apiacc.manage-rtc.com → 127.0.0.1:5001   ← NEW               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────── PM2 (deploy user) ────────────────────────┐ │
│  │  manage-rtc-api-dev  (port 5000)  ← DEV, untouched            │ │
│  │  manage-rtc-api-acc  (port 5001)  ← NEW ACC process           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  /var/www/                                                           │
│  ├── dev.manage-rtc.com/frontend/    ← DEV, untouched              │
│  ├── apidev.manage-rtc.com/backend/  ← DEV, untouched              │
│  ├── acc.manage-rtc.com/frontend/    ← NEW                         │
│  └── apiacc.manage-rtc.com/backend/  ← NEW                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Step 1 — Cloudflare DNS

In your Cloudflare dashboard for `manage-rtc.com`, add two A records:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | `acc` | `31.97.229.42` | Proxied (orange) |
| A | `apiacc` | `31.97.229.42` | Proxied (orange) |

> The existing wildcard Cloudflare origin certificate already covers `*.manage-rtc.com`, so both new subdomains have SSL automatically.

---

## 5. Step 2 — Server Setup (one-time)

SSH into the VPS:

```bash
ssh ubuntu@31.97.229.42
```

### Create deployment directories

```bash
sudo mkdir -p /var/www/acc.manage-rtc.com/frontend
sudo mkdir -p /var/www/apiacc.manage-rtc.com/backend
sudo chown -R deploy:deploy /var/www/acc.manage-rtc.com
sudo chown -R deploy:deploy /var/www/apiacc.manage-rtc.com
```

### Create staging directories

```bash
sudo -u deploy mkdir -p /home/deploy/frontend_release_acc
sudo -u deploy mkdir -p /home/deploy/releases/backend-acc
```

---

## 6. Step 3 — Nginx Configuration for ACC

### Frontend — acc.manage-rtc.com

Create `/etc/nginx/sites-available/acc.manage-rtc.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name acc.manage-rtc.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name acc.manage-rtc.com;

    # Reuse the existing Cloudflare wildcard origin certificate
    ssl_certificate     /etc/ssl/cloudflare/manage-rtc.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/manage-rtc.com.key;

    root /var/www/acc.manage-rtc.com/frontend;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-store";
    }
    location / {
        try_files $uri /index.html;
    }
    location ~* \.(?:js|css|svg|png|jpg|jpeg|gif|woff2?)$ {
        expires 7d;
        access_log off;
        add_header Cache-Control "public, max-age=604800, immutable";
    }
}
```

### Backend — apiacc.manage-rtc.com

Create `/etc/nginx/sites-available/apiacc.manage-rtc.com`:

```nginx
upstream apiacc_node {
    server 127.0.0.1:5001;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name apiacc.manage-rtc.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name apiacc.manage-rtc.com;

    # Reuse the existing Cloudflare wildcard origin certificate
    ssl_certificate     /etc/ssl/cloudflare/manage-rtc.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/manage-rtc.com.key;

    location /socket.io/ {
        proxy_pass         http://apiacc_node;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass         http://apiacc_node;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### Enable and reload

```bash
sudo ln -s /etc/nginx/sites-available/acc.manage-rtc.com \
           /etc/nginx/sites-enabled/acc.manage-rtc.com

sudo ln -s /etc/nginx/sites-available/apiacc.manage-rtc.com \
           /etc/nginx/sites-enabled/apiacc.manage-rtc.com

sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Step 4 — GitHub Repository Variables

Navigate to each repo: **Settings → Secrets and variables → Actions → Variables tab → New repository variable**

> **Repository Variables** are for non-sensitive configuration. They are visible in workflow logs.
> Do NOT put passwords or API keys here — those go in Secrets (Step 5).

### `manageRTC-dev` — Repository Variables

| Variable Name | Value |
|---------------|-------|
| `FRONTEND_DEPLOY_PATH` | `/var/www/dev.manage-rtc.com/frontend` |
| `FRONTEND_STAGING_DIR` | `frontend_release` |
| `BACKEND_DEPLOY_PATH` | `/var/www/apidev.manage-rtc.com/backend` |
| `BACKEND_STAGING_DIR` | `releases/backend` |
| `BACKEND_API_URL` | `https://apidev.manage-rtc.com` |
| `FRONTEND_URL` | `https://dev.manage-rtc.com` |
| `PM2_APP_NAME` | `manage-rtc-api-dev` |
| `BACKUP_PREFIX_FE` | `frontend` |
| `BACKUP_PREFIX_BE` | `backend` |

### `manageRTC-acc` — Repository Variables

| Variable Name | Value |
|---------------|-------|
| `FRONTEND_DEPLOY_PATH` | `/var/www/acc.manage-rtc.com/frontend` |
| `FRONTEND_STAGING_DIR` | `frontend_release_acc` |
| `BACKEND_DEPLOY_PATH` | `/var/www/apiacc.manage-rtc.com/backend` |
| `BACKEND_STAGING_DIR` | `releases/backend-acc` |
| `BACKEND_API_URL` | `https://apiacc.manage-rtc.com` |
| `FRONTEND_URL` | `https://acc.manage-rtc.com` |
| `PM2_APP_NAME` | `manage-rtc-api-acc` |
| `BACKUP_PREFIX_FE` | `frontend-acc` |
| `BACKUP_PREFIX_BE` | `backend-acc` |

---

## 8. Step 5 — GitHub Repository Secrets

Navigate to: **Settings → Secrets and variables → Actions → Secrets tab → New repository secret**

> **Repository Secrets** are for sensitive data. Values are masked in logs.

### SSH Connection (same values in both repos)

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `31.97.229.42` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private SSH key content for the deploy user |

### Frontend Secret

| Secret | DEV value | ACC value |
|--------|-----------|-----------|
| `CLERK_PUBLISHABLE_KEY_PUBLIC` | DEV Clerk publishable key | ACC Clerk publishable key |

### Backend Secrets

| Secret | DEV value | ACC value |
|--------|-----------|-----------|
| `ENV_PORT` | `5000` | `5001` |
| `ENV_MONGO_URI` | DEV MongoDB URI | ACC MongoDB URI |
| `ENV_CLERK_SECRET_KEY` | DEV Clerk secret | ACC Clerk secret |
| `ENV_CLERK_JWT_KEY` | DEV Clerk JWT key | ACC Clerk JWT key |
| `ENV_CLERK_PUBLISHABLE_KEY` | DEV Clerk publishable key | ACC Clerk publishable key |
| `ENV_JWT` | DEV JWT secret | ACC JWT secret |
| `ENV_SOCKETS_ENABLED` | `true` | `true` |
| `ENV_ZONE_ID` | Cloudflare zone ID | Same |
| `ENV_CLOUDFLARE_API_KEY` | Cloudflare API key | Same |
| `ENV_DOMAIN` | `manage-rtc.com` | Same |
| `ENV_VPS_IP` | `31.97.229.42` | Same |

> **`ENV_PORT`** is the critical difference: DEV uses `5000`, ACC uses `5001`.
>
> **Database:** Use a separate MongoDB database for ACC to keep test data isolated.
> Same cluster is fine — just change the database name in the URI:
> `mongodb+srv://user:pass@cluster.mongodb.net/manageRTC-acc`

---

## 9. Step 6 — How the Workflows Use Variables

The workflow files (`.github/workflows/deploy-frontend.yml` and `deploy-backend.yml`) are **identical** in both repos. They reference `vars.X` and `secrets.X` directly — no detection logic, no hardcoded paths.

### deploy-frontend.yml — key variable usage

```yaml
# .env.production — backend URL comes from a variable
REACT_APP_BACKEND_URL=${{ vars.BACKEND_API_URL }}

# Upload to the correct staging directory
target: "/home/${{ secrets.VPS_USER }}/${{ vars.FRONTEND_STAGING_DIR }}/"

# Copy to the correct deploy path
env:
  DEPLOY_PATH: ${{ vars.FRONTEND_DEPLOY_PATH }}
  STAGING_DIR: ${{ vars.FRONTEND_STAGING_DIR }}
```

### deploy-backend.yml — key variable usage

```yaml
# Deploy to the correct path with the correct PM2 process name
env:
  DEPLOY_PATH: ${{ vars.BACKEND_DEPLOY_PATH }}
  PM2_NAME:    ${{ vars.PM2_APP_NAME }}
  STAGING_DIR: ${{ vars.BACKEND_STAGING_DIR }}
  FRONTEND_URL: ${{ vars.FRONTEND_URL }}

# FRONTEND_URL written into .env on the server:
echo "FRONTEND_URL=$FRONTEND_URL" >> .env
```

### Result when run in each repo

| Variable | In `manageRTC-dev` | In `manageRTC-acc` |
|----------|--------------------|--------------------|
| `vars.FRONTEND_DEPLOY_PATH` | `/var/www/dev.manage-rtc.com/frontend` | `/var/www/acc.manage-rtc.com/frontend` |
| `vars.BACKEND_API_URL` | `https://apidev.manage-rtc.com` | `https://apiacc.manage-rtc.com` |
| `vars.PM2_APP_NAME` | `manage-rtc-api-dev` | `manage-rtc-api-acc` |
| `secrets.ENV_PORT` | `5000` | `5001` |

---

## 10. Environment Variable Differences

### Frontend `.env.production`

| Variable | DEV | ACC |
|----------|-----|-----|
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | DEV Clerk key (`secrets`) | ACC Clerk key (`secrets`) |
| `REACT_APP_BACKEND_URL` | `https://apidev.manage-rtc.com` (`vars`) | `https://apiacc.manage-rtc.com` (`vars`) |

### Backend `.env`

| Variable | DEV | ACC |
|----------|-----|-----|
| `PORT` | `5000` (`secrets`) | `5001` (`secrets`) |
| `MONGO_URI` | DEV DB URI (`secrets`) | ACC DB URI (`secrets`) |
| `FRONTEND_URL` | `https://dev.manage-rtc.com` (`vars`) | `https://acc.manage-rtc.com` (`vars`) |
| `NODE_ENV` | `production` | `production` |

---

## 11. Merge / Sync Safety

Because the workflow files contain **no hardcoded paths and no detection logic**, they are safe to merge or sync in either direction.

```
manageRTC-dev  ──merge──▶  manageRTC-acc    ✅ safe — vars provide ACC values
manageRTC-acc  ──merge──▶  manageRTC-dev    ✅ safe — vars provide DEV values
```

The only thing that determines which environment gets deployed to is the **repository variable values** — not the workflow file content.

### Syncing from DEV → ACC

```bash
# In your local manageRTC-acc clone
git fetch upstream
git merge upstream/main
git push origin main
# ↑ triggers ACC deploy using ACC's vars — DEV is never touched
```

---

## 12. Verification Checklist

### Infrastructure

- [ ] Cloudflare DNS: `acc` → `31.97.229.42` (Proxied)
- [ ] Cloudflare DNS: `apiacc` → `31.97.229.42` (Proxied)
- [ ] VPS directory: `/var/www/acc.manage-rtc.com/frontend/` exists, owned by `deploy`
- [ ] VPS directory: `/var/www/apiacc.manage-rtc.com/backend/` exists, owned by `deploy`
- [ ] VPS staging: `/home/deploy/frontend_release_acc/` exists
- [ ] VPS staging: `/home/deploy/releases/backend-acc/` exists
- [ ] nginx sites enabled: `acc.manage-rtc.com` and `apiacc.manage-rtc.com`
- [ ] `sudo nginx -t` passes

### GitHub — `manageRTC-acc` repo

- [ ] All 9 Repository Variables set (Step 4)
- [ ] All Repository Secrets set (Step 5)
- [ ] `ENV_PORT` secret is `5001`
- [ ] SSH Smoke Test workflow passes (run manually under Actions)

### First Deployment

- [ ] Manually trigger `Deploy Frontend` workflow → green
- [ ] Manually trigger `Deploy Backend` workflow → green

### Post-Deployment Verification

```bash
ssh deploy@31.97.229.42

# Both processes should be online
pm2 list
# manage-rtc-api-dev   online   (port 5000)
# manage-rtc-api-acc   online   (port 5001)

# ACC backend listening
netstat -tlnp | grep 5001

# Quick smoke test
curl -s http://localhost:5001/
```

- [ ] `https://acc.manage-rtc.com` loads the frontend
- [ ] `https://apiacc.manage-rtc.com/health` responds
- [ ] `https://dev.manage-rtc.com` still works — DEV untouched

---

## 13. Rollback

### ACC Frontend Rollback

```bash
ssh deploy@31.97.229.42

ls -la ~/backups/frontend-acc-*.tar.gz

cd /var/www/acc.manage-rtc.com
rm -rf frontend/*
tar -xzf ~/backups/frontend-acc-YYYYMMDD-HHMMSS.tar.gz -C frontend/
sudo systemctl reload nginx
```

### ACC Backend Rollback

```bash
ssh deploy@31.97.229.42

ls -la ~/backups/backend-acc-*.tar.gz

cd /var/www/apiacc.manage-rtc.com
rm -rf backend/*
tar -xzf ~/backups/backend-acc-YYYYMMDD-HHMMSS.tar.gz -C backend/
cd backend && npm ci --omit=dev
pm2 reload manage-rtc-api-acc --update-env
```

> ACC backups (`frontend-acc-*`, `backend-acc-*`) and DEV backups (`frontend-*`, `backend-*`) are stored in the same `~/backups/` folder but with distinct prefixes — they never interfere.

---

## 14. Troubleshooting

### Port 5001 conflict

```bash
netstat -tlnp | grep 5001
# If occupied by another process, change ENV_PORT secret to a free port (e.g. 5002)
# and update the nginx upstream accordingly
```

### 502 Bad Gateway on apiacc.manage-rtc.com

```bash
pm2 status manage-rtc-api-acc
pm2 logs manage-rtc-api-acc --lines 50
netstat -tlnp | grep 5001
pm2 restart manage-rtc-api-acc
```

### Variable not found / workflow uses wrong path

Check that all 9 repository variables are set in the ACC repo:

**Settings → Secrets and variables → Actions → Variables tab**

If a variable is missing, the step will use an empty string and likely fail with a path error.

### SSL errors on acc / apiacc subdomains

The Cloudflare wildcard origin cert covers `*.manage-rtc.com`. Verify the cert file exists:

```bash
ls -la /etc/ssl/cloudflare/manage-rtc.com.pem
```

### DEV environment accidentally affected

Verify the ACC repo variables are not pointing at DEV paths:

```bash
# In GitHub: manageRTC-acc → Settings → Variables
# FRONTEND_DEPLOY_PATH must be /var/www/acc.manage-rtc.com/frontend
# BACKEND_DEPLOY_PATH  must be /var/www/apiacc.manage-rtc.com/backend
# PM2_APP_NAME         must be manage-rtc-api-acc
```

---

## Quick Reference

### Ports

| Environment | Internal port | PM2 process name |
|-------------|---------------|-----------------|
| DEV | `5000` (`secrets.ENV_PORT`) | `manage-rtc-api-dev` (`vars.PM2_APP_NAME`) |
| ACC | `5001` (`secrets.ENV_PORT`) | `manage-rtc-api-acc` (`vars.PM2_APP_NAME`) |

### Server paths

| Environment | Frontend | Backend |
|-------------|----------|---------|
| DEV | `/var/www/dev.manage-rtc.com/frontend/` | `/var/www/apidev.manage-rtc.com/backend/` |
| ACC | `/var/www/acc.manage-rtc.com/frontend/` | `/var/www/apiacc.manage-rtc.com/backend/` |

### Useful commands

```bash
pm2 list                                    # all processes
pm2 logs manage-rtc-api-acc --lines 100     # ACC backend logs
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
```

---

**Document Version:** 2.0
**Last Updated:** February 18, 2026
**Applies to:** `manageRTC-acc` repo (fork of `manageRTC-dev`)
