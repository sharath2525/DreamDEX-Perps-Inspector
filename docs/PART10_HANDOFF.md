# Part 10 — release candidate handoff

4 November 2026. Software verification is distinct from real signed acceptance. Parts 5–6 and 9 cannot be marked fully accepted until an authorized funded user signs the testnet lifecycle. No transaction, disclosure, bounty report or social post was sent during this implementation.

## Verified

- Full Chromium suite: **62 passed**, with `PEI_LIVE_READS=1`, including two live browser cases. Remaining signing/lifecycle tests use explicitly synthetic RPC and wallet fixtures.
- Public Part 8 probes: all four history categories passed. Part 9 probes: margin state, native stop context/list and operator permissions passed. These are reads, not transaction evidence.
- Production build, TypeScript and lint passed. SDK remains pinned to 0.32.1; no new contracts.
- `npm audit --omit=dev --json`: zero reported production vulnerabilities on this date. This is advisory coverage, not a security guarantee.
- Limited source/bundle secret and fixture scan passed. Desktop history and mobile operations screenshots were visually inspected; automated viewport checks passed.

Clean source copy: `npm ci --ignore-scripts`, lint, TypeScript and production build all passed. Windows sandbox initially denied npm cache access; the authorized retry succeeded. Full dependency audit reports **12 moderate development-tree entries** stemming from minimatch globparts amplification (GHSA-g3hv-75wg-m249). Production-only audit reports zero. No forced major downgrade or incompatible transitive override was applied. Avoid running the lint toolchain on untrusted glob patterns; this remains a development-tooling limitation. Security headers and SPA fallback files are included for compatible hosts; their effective deployment behavior requires host verification. Large SDK chunks remain a build warning.

## Delivered release materials

## Private deployment result

Sites returned **succeeded** on 4 November 2026 at 18:22 UTC for [Perps Execution Inspector](https://perps-execution-inspector.sharathprvtairdrops.chatgpt.site). Owner-only access was preserved. Source commit: `944eca273f9fa0713d48b771b30eef831e68c8c9`. Deployment: `appgdep_6aeb77c7d8e48191937749289a803574`. Site: `appgprj_6aeb6be9588481918ecb72a619f774b4`. Version: `appgprj_6aeb6be9588481918ecb72a619f774b4~appgver_96ccd9d07bd081919a205b540b52aef7`.

The native hosting result verifies publication; a real extension wallet, host response headers and authenticated hosted deep-route behavior were not independently tested. Local browser deep-route checks passed and the development URL returned HTTP 200. The packaged static artifact is `.release/pei-site-release.tar.gz`; its verified clean source checkout is `.release/release-1793814483830`. These local paths are ignored. The source helper used a process-only exception for this sandbox-owned Git directory; no global safe-directory change was made. No credential was saved in project source or the archive.

### Materials

See [runbook](RELEASE_RUNBOOK.md), [Part 8](PART8_HANDOFF.md), [Part 9](PART9_HANDOFF.md), [feature audit](FEATURE_AUDIT.md), [eligibility checklist](SUBMISSION_CHECKLIST.md) and [unsent submission draft](SUBMISSION_DRAFT.md). The source-only release copy and static packaging scripts preserve the working application.

## Remaining acceptance

Use the runbook with a dedicated testnet account: verify funds category, signer/owner, STT, small order and gas budget; explicitly sign; inspect actual receipt/fills/remainder/exposure; cancel resting remainder; export evidence. Separately exercise intended margin, stop and operator writes. No hashes or successful trades are invented to fill these gates.

Official current bounty eligibility and whitelist are unconfirmed. The supplied November 1 deadline has passed; conflicting third-party dates are not an organizer extension. A private preview does not satisfy a public GitHub repository, public demo or genuine X-post links.
