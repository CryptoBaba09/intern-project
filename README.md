# intern-project

Monorepo with two independently-deployed pieces:

- [`intern-site/`](./intern-site) — Next.js website. Deployed on **Vercel**.
- [`intern-burn-bot/`](./intern-burn-bot) — Node.js background worker (fee-claim / buyback bot). Deployed on **Railway** as a worker (no public web port).

Each subfolder has its own `package.json` and is deployed as its own "root directory" project on its respective platform, pointed at this one repo.

See each subfolder's own README for details on that piece.

## Secrets

Never commit a real `.env` file. `intern-burn-bot/.env.example` documents the required variables — copy it to `.env` locally, or set the same variables as secret environment variables in the Railway dashboard for production. The `PRIVATE_KEY` variable in particular controls a real wallet and must only ever live in Railway's env vars, never in git.
