# Amanda's original garden planner

This directory preserves Amanda's original work exactly as it appeared on
`main` at commit `ee2b8a7`, before the hosted GardenBuddy modernization began.

The three original files are:

- `index.html` — the complete original browser application
- `care-data.json` — its original plant-care data
- `README.md` — its original instructions

Open `index.html` in a browser to run the original planner. Its saved garden
still lives only in that browser's local storage, just as it did originally.

## Keep this archive separate

The active hosted GardenBuddy application lives at the repository root. Normal
feature work, formatting, builds, and deployments must not change or consume
these archived files. The archive is excluded from Prettier and the Docker build
context, and an automated test verifies the original files' SHA-256 checksums.

`care-data.json` is preserved as part of the history. It is not treated as a
verified source for the hosted app; reviewed plant facts live in the active
catalog with their citations and evidence levels.

If Amanda ever wants to evolve the old version itself, copy this directory to a
new working directory first so this snapshot remains a trustworthy original.
