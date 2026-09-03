# intern-project

Monorepo with three pieces:

- [`intern-site/`](./intern-site) — Next.js website. Deployed on **Vercel**.
- [`intern-burn-bot/`](./intern-burn-bot) — Node.js background worker (fee-claim / split / buyback bot). Deployed on **Railway** as a worker (no public web port).
- [`contracts/`](./contracts) — Solidity (Hardhat). `InternStakingRewards`, the stake-to-earn contract the burn bot deposits BE into for holder distributions. Not yet deployed to a real network — see that folder's README before it is.

`intern-site` and `intern-burn-bot` each have their own `package.json` and are deployed as their own "root directory" project on their respective platform, pointed at this one repo. `contracts` is a separate local dev/test workspace — it isn't deployed to Vercel or Railway.

See each subfolder's own README for details on that piece.

## Secrets

Never commit a real `.env` file. `intern-burn-bot/.env.example` documents the required variables — copy it to `.env` locally, or set the same variables as secret environment variables in the Railway dashboard for production. The `PRIVATE_KEY` variable in particular controls a real wallet and must only ever live in Railway's env vars, never in git.
