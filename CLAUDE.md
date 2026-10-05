# GardenBuddy release guardrails

## Regression tests are required

- `npm run test:regression` (type-check, build, unit tests, and every browser test on desktop, iPhone and Android) must pass before staging, before merging, and before production. `npm run deploy:staging` runs it and stops on any failure.
- Every bug fix and every change to behaviour or layout ships with a test that fails without the change. Put logic tests beside the code as `*.test.ts` (Vitest), and interaction or phone-layout tests in `e2e/gardenbuddy.spec.ts` (Playwright).
- Never delete, skip, loosen, or retry-until-green a test to get the gate through. Fix the code, or ask the owner if the test itself is wrong.
- A change with no test needs a reason in the commit message (for example, copy-only or docs-only).

## Releases

- `original-planner/` is Amanda's byte-for-byte historical snapshot. Do not edit, format, import from, or deploy its original `index.html`, `care-data.json`, or `README.md` unless the owner explicitly asks to replace the archive. Active GardenBuddy work lives at the repository root.
- Work on a feature branch. Never mix changes from `origin/dev` into this project unless the owner explicitly asks.
- Every push and pull request runs the "Regression tests" GitHub workflow, and `promote:production` refuses a SHA without a passing `regression` check, so push the candidate branch before promoting.
- Deploy a clean committed candidate with `npm run deploy:staging`.
- Record the staging SHA shown in Settings and ask the owner to test that revision on her phone.
- Production is manual. Only after approval, run `APPROVED_STAGING_SHA=<sha> npm run promote:production` from clean `main` or the exact approved candidate branch. The guarded script verifies staging, safely switches/fast-forwards `main`, pushes, and deploys that exact SHA.
- Never deploy production from a dirty tree, a detached candidate, or a commit different from `origin/main`.
- Staging and production have separate SQLite volumes and secrets. Never copy production data into staging.
- Do not commit passphrases, hashes, cookies, Fly tokens, database files, or `.env` files.
