# Render Deployment Guide

## Fixed Issues

### ✅ Issue 1: Prisma + OpenSSL (Alpine Linux)
**Solution**: Updated `Dockerfile` to use `node:20-slim` instead of `node:20-alpine` and added OpenSSL installation.

### ✅ Issue 2: Redis Connection  
**Solution**: Updated code to support `REDIS_URL` environment variable (provided by Render) in addition to individual host/port/password vars.

---

##  Deploy to Render

### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Name: `order-execution-db`
4. Database: `order_execution`
5. User: `order_execution_user`
6. Region: Choose closest to you
7. Plan: **Free**
8. Click **Create Database**
9. **Copy the Internal Database URL** (starts with `postgresql://`)

### Step 2: Create Redis Instance

1. Click **New** → **Redis**
2. Name: `order-execution-redis`
3. Region: Same as PostgreSQL
4. Plan: **Free** (max 25MB)
5. Maxmemory Policy: `noeviction`
6. Click **Create Redis**
7. **Copy the Internal Redis URL** (starts with `redis://`)

### Step 3: Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Name: `order-execution-engine`
4. Region: Same as above
5. Branch: `main`
6. Runtime: **Docker**
7. Plan: **Free**

### Step 4: Configure Environment Variables

Add these environment variables in the Render dashboard:

```
NODE_ENV=production
DATABASE_URL=<paste-postgresql-internal-url-here>
REDIS_URL=<paste-redis-internal-url-here>
QUEUE_CONCURRENCY=10
QUEUE_RATE_LIMIT=100
MOCK_DEX_ENABLED=true
MOCK_DELAY_MIN=2000
MOCK_DELAY_MAX=3000
```

**IMPORTANT**: Use the **Internal URLs**, not External!

### Step 5: Add Build Command (if needed)

Render auto-detects Docker, but if needed:
- Build Command: (leave empty - Docker handles it)
- Start Command: (leave empty - Docker handles it)

### Step 6: Deploy!

1. Click **Create Web Service**
2. Wait for build (3-5 minutes)
3. Once deployed, your API will be at: `https://order-execution-engine.onrender.com`

---

## Post-Deployment

### Run Migrations

After first deployment, you need to run migrations:

1. Go to your web service in Render
2. Click **Shell** tab
3. Run:
```bash
npx prisma migrate deploy
```

### Test the API

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Submit order
curl https://your-app.onrender.com/api/orders/execute \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":100}'
```

---

## Troubleshooting

### If deployment fails:

1. **Check Logs**: Go to **Logs** tab in Render dashboard
2. **Verify Environment Variables**: Make sure all URLs are correct
3. **Use Internal URLs**: PostgreSQL and Redis must use internal URLs (not external)
4. **Check Dockerfile**: Make sure it's using `node:20-slim`

### Common Issues:

- **"ECONNREFUSED"**: Using external URLs instead of internal
- **"libssl.so.1.1 not found"**: Using alpine instead of slim
- **Database errors**: Run migrations with `npx prisma migrate deploy`

---

## Free Tier Limitations

- **Web Service**: Spins down after 15 min of inactivity (first request takes ~30s)
- **PostgreSQL**: 90-day expiration on free tier
- **Redis**: 25MB max memory

For production, upgrade to paid plans!

---

## Update README

After deployment, update your `README.md` with:
```markdown
## 🌐 Live Demo

**API Base URL**: https://your-app.onrender.com

**Endpoints**:
- Health: `GET /api/health`
- Submit Order: `POST /api/orders/execute`
- Get Order: `GET /api/orders/:orderId`
...
```

Good luck! 🚀
