# Deploying Torch

Torch runs as **three containers** from a single image:

| Container | What it is | Port | Key env |
|---|---|---|---|
| `db` | Postgres + pgvector | 5432 | — |
| `web` | User-facing app (chat, library) | 3000 | `APP_ROLE=web` |
| `admin` | Admin dashboards + observability + ingest | 3000 | `APP_ROLE=admin` |

`web` and `admin` are the **same image** (`Dockerfile`), differentiated only by
`APP_ROLE` (enforced in `proxy.ts`). Admin authorization is still checked per
route by `requireAdmin()`.

---

## Local (Docker Compose)

```bash
cp .env.example .env.local        # fill in Clerk + AI keys (DATABASE_URL is overridden to the db container)
# Provide the publishable key for the build (inlined into the client bundle):
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx   # or put it in a .env file next to compose
docker compose up --build
```

- `db` starts, the one-shot `migrate` job applies migrations, then `web`
  (http://localhost:3000) and `admin` (http://localhost:3001) start.
- Seed data once the stack is up:
  ```bash
  docker compose exec web node scripts/db-migrate.mjs   # (already run by migrate job)
  # seeds/bibles run from a full dev checkout (they use tsx), e.g. locally:
  pnpm seed:sources && pnpm bibles:public && pnpm embed:bible
  ```

> Migrations run in-container via `scripts/db-migrate.mjs` (drizzle-orm migrator,
> zero extra deps). The data scripts (`seed:sources`, `bibles:public`,
> `embed:bible`) use `tsx` and run from a dev checkout against `DATABASE_URL`.

---

## Railway

### Quickest path (CLI, scripted)
A `torch` project already exists. From the repo root:
```bash
railway login                      # interactive — REQUIRED before any write op
railway link                       # pick the `torch` project
cp .env.example .env.local         # fill in keys
bash scripts/railway-deploy.sh     # provisions Postgres + web + admin, deploys both
```
Then generate domains in the dashboard and load data (see the script's closing notes).
For a public domain, use a **production Clerk instance** (dev instances add a
device-trust step). The rest of this section is the equivalent manual setup.

---

Create one project with **three services**:

1. **Postgres** — add the Railway Postgres plugin (its image supports
   `CREATE EXTENSION vector`). Copy its connection string.

2. **web** — deploy this repo (Dockerfile builder).
   - Variables: `APP_ROLE=web`, `RUN_MIGRATIONS=true` (runs migrations on boot —
     set this on **web only**), `DATABASE_URL=${{Postgres.DATABASE_URL}}`, plus
     all keys from `.env.example` (Clerk, OpenAI/OpenRouter, optional Cohere/api.bible).
   - Build arg: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (inlined at build).
   - Health check path: `/api/health`.

3. **admin** — deploy the same repo/Dockerfile again.
   - Variables: `APP_ROLE=admin`, `RUN_MIGRATIONS=false`, same `DATABASE_URL`
     and keys. Same build arg + health check.

### Migrations & data
- Schema migrations apply automatically on the `web` container (`RUN_MIGRATIONS=true`).
- Load reference data once (from a dev checkout pointed at the Railway DB, or a
  Railway one-off job):
  ```bash
  DATABASE_URL=<railway-postgres-url> pnpm seed:sources
  DATABASE_URL=<railway-postgres-url> pnpm bibles:public
  DATABASE_URL=<railway-postgres-url> pnpm embed:bible   # needs OPENAI_API_KEY
  ```

### Notes
- `NEXT_PUBLIC_*` values are build-time (baked into the client bundle); set them
  as **build args/variables**, not just runtime env.
- Only one container should set `RUN_MIGRATIONS=true` to avoid concurrent migration runs.
- Scale `web` independently of `admin`; both are stateless.
