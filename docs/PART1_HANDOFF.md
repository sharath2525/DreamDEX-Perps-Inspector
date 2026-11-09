# Part 1 — implemented

Verified 3 November 2026 IST. Continued into Parts 2–3 at the user's explicit request.

Delivered the npm workspace, pinned SDK 0.32.1, React/Vite/TypeScript app, responsive navigation, nine page destinations, error boundary, theme switching, expected network/contract settings and truthful unavailable states. Existing research files were preserved.

Validation: clean `npm ci --ignore-scripts --no-fund`, lint, TypeScript and production build passed. Seven Chromium browser checks passed: route navigation/no external or wallet requests; deep links and recovery; theme persistence/skip link; denied storage; mobile keyboard navigation; viewport fit at 320/390/768/1440px; clipboard success/failure. The initial mobile focus test found a boundary issue, fixed with explicit first/last keyboard focus wrapping. The first sandboxed test run stalled during cleanup and was stopped; the final outside-sandbox run exited successfully with 7 passed in 8.5 seconds.

Desktop/mobile screenshots were generated under `test-results/`; desktop dark layout was visually inspected. No live orders or wallet operations were performed. Chromium coverage is not a claim of Safari/Firefox certification.

Dependency audit: 12 moderate development dependency entries trace to the single minimatch glob-pattern advisory linked in README. Production-only audit returned zero advisories. No forced dependency-major override was applied.

Demo: `npm run dev`, open http://127.0.0.1:5173, navigate pages, change theme, use the narrow-screen menu and inspect Settings. Subsequent parts replace relevant unavailable pages with verified read-only data.
