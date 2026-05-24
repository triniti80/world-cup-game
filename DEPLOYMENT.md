# Deployment

## Railway

This app deploys cleanly to Railway as a Docker-backed Next.js service with a
Railway PostgreSQL service.

### 1. Create the Railway project

1. Create a new Railway project.
2. Add the GitHub repo `triniti80/world-cup-game`.
3. Add a PostgreSQL service from the Railway project canvas.

Railway will use `railway.json`, build from `Dockerfile`, run database
migrations before deploy, then start the Next.js standalone server.

### 2. Configure variables

On the Next.js service, add:

```text
DATABASE_URL=<reference the Railway Postgres DATABASE_URL>
MASTER_KEY=<generate with openssl rand -base64 32>
SESSION_SECRET=<generate with openssl rand -base64 32>
NODE_ENV=production
```

Use Railway's reference variable flow for `DATABASE_URL` so it stays connected
to the Postgres service credentials.

Do not upload local `.env` files or OAuth client secret JSON files.

### 3. Deploy

Push to GitHub and let Railway deploy. The pre-deploy command is:

```bash
node scripts/migrate.mjs
```

The health check endpoint is:

```text
/api/health
```

### 4. Domain

After the Railway deployment is healthy:

1. Open the Railway service.
2. Go to Networking / Domains.
3. Add the production domain or subdomain.
4. Copy Railway's required DNS records into SiteGround DNS.
5. Wait for DNS and TLS certificate provisioning.

For a subdomain such as `wc2026.example.com`, this is normally a CNAME record.
For a root domain such as `example.com`, use the record type Railway shows in
the domain setup screen.
