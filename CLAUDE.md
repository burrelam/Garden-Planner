# GardenBuddy release guardrails

- `original-planner/` is Amanda's byte-for-byte historical snapshot. Do not edit, format, import from, or deploy its original `index.html`, `care-data.json`, or `README.md` unless the owner explicitly asks to replace the archive. Active GardenBuddy work lives at the repository root.
- Work on a feature branch. Never mix changes from `origin/dev` into this project unless the owner explicitly asks.
- Run `npm run check` before staging.
- Deploy a clean committed candidate with `npm run deploy:staging`.
- Record the staging SHA shown in Settings and ask the owner to test that revision on her phone.
- Production is manual. Only after approval, run `APPROVED_STAGING_SHA=<sha> npm run promote:production` from clean `main` or the exact approved candidate branch. The guarded script verifies staging, safely switches/fast-forwards `main`, pushes, and deploys that exact SHA.
- Never deploy production from a dirty tree, a detached candidate, or a commit different from `origin/main`.
- Staging and production have separate SQLite volumes and secrets. Never copy production data into staging.
- Do not commit passphrases, hashes, cookies, Fly tokens, database files, or `.env` files.
