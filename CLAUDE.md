# GardenBuddy release guardrails

- Work on a feature branch. Never mix changes from `origin/dev` into this project unless the owner explicitly asks.
- Run `npm run check` before staging.
- Deploy a clean committed candidate with `npm run deploy:staging`.
- Record the staging SHA shown in Settings and ask the owner to test that revision on her phone.
- Production is manual. Only after approval, check out clean `main`, then run `APPROVED_STAGING_SHA=<sha> npm run promote:production`. The guarded script verifies staging, fast-forwards, pushes, and deploys that exact SHA.
- Never deploy production from a dirty tree, a detached candidate, or a commit different from `origin/main`.
- Staging and production have separate SQLite volumes and secrets. Never copy production data into staging.
- Do not commit passphrases, hashes, cookies, Fly tokens, database files, or `.env` files.
