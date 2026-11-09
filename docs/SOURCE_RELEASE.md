# Source and reviewer access release

Prepared locally; no public GitHub repository has been created or claimed. The Sites source repository and owner-private hosted preview are not substitutes for the bounty's accessible GitHub repository/demo.

Clean-source verification: the prepared source copy installed all 189 packages from the local npm cache and built successfully with no environment secrets. Final public repository/license choice and signed-out demo access remain outstanding.

1. Run the final lint/build/browser checks and `node scripts/release-check.mjs`.
2. Run `node scripts/package-submission.mjs`. It copies an allowlist to a new timestamped directory under `.release/`, writes a SHA-256 source manifest, and creates a `.tar.gz` source archive. It never includes `.git`, hosting credentials, `.env`, local journals, screenshots, browser profiles, node_modules or build output.
3. Review the manifest and archive. Public research account addresses are included in documentation; personal browser test notes are not. A pattern scan is not a comprehensive secret/security audit.
4. Choose the intended GitHub owner/repository and source license before publication. Recommended option for a freely reusable MVP is MIT, but no license grant has been applied without the project owner's choice. Dependency licenses remain their respective authors' terms.
5. From a clean extraction, follow README (`npm ci --ignore-scripts`, `npm run build`, `npm run preview`). Browser tests additionally require the Playwright Chromium installation. No key or environment variable is required for public reads.
6. Publish reviewed source only to the approved repository. Record the real repository URL and commit. Do not paste a placeholder GitHub URL into the submission.
7. Provide an approved judge-accessible hosting URL or a dated recording. Test access signed out. A copied report URL does not bypass private hosting permissions.
8. Record the deployed source commit and tested artifact digest in the release handoff. Evidence may refer to older transactions but must say so; do not pretend the transaction was executed by a newer revision.

The source bundle is a concrete reviewable artifact. Creating a GitHub repository, changing hosting audience, posting to X, emailing reports and submitting a Build are separate external actions; their destinations/content must be known and authorized. None is silently performed by packaging.
