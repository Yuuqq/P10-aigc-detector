# Code Review: P10 AIGC 文本解构探测仪

## Summary
The P10 AIGC Detector features a commendable zero-dependency frontend architecture (pure HTML/CSS/JS). This ensures excellent longevity and maintainability for an educational tool. The local-only processing approach guarantees privacy and avoids complex backend infrastructure. However, there are significant gaps in test coverage and some algorithmic edge cases (performance and reliability) that need addressing.

## Findings

### HIGH
*(No high severity findings)*

### MEDIUM
- **[Performance] Inefficient Regex Compilation in Hot Loop**
  - **Location**: `app.js` (Line 69, `calcPerplexity`)
  - **Impact**: `new RegExp(cw, "g")` is instantiated inside a `.forEach` loop for *every* sentence and *every* cliché word. For longer texts (e.g., 2000+ words), this creates massive unnecessary garbage collection and CPU overhead, potentially freezing the main thread.
  - **Fix**: Pre-compile the regular expressions once outside the function into an array: `const PRECOMPILED_CLICHES = Array.from(CLICHE_WORDS).map(cw => new RegExp(cw, "g"));`. (Note: using `.join('|')` would incorrectly alter matching semantics by missing overlapping strings like "一方面" and "另一方面").
- **[Reliability] Regex splitting breaks on decimals/abbreviations**
  - **Location**: `app.js` (Line 37, `splitSentences`)
  - **Impact**: The regex `/([^。！？\.\!\?]+[。！？\.\!\?]?)/g` splits on any period. A number like "3.14" will be split into two "sentences" ("3." and "14"), artificially inflating the burstiness variance and skewing results.
  - **Fix**: Refine the regex to avoid splitting on periods surrounded by digits, e.g. using `/(.+?(?:[。！？\!\?]|\.(?!\d)|$))/g`.

### LOW
- **[Test Coverage] Missing Automated Tests**
  - **Location**: Entire Repository
  - **Impact**: The core logic in `app.js` is untested. Given this is a classroom project without CI, this is low priority, but any future improvements to the heuristic algorithms risk introducing silent regressions.
  - **Fix**: Introduce a lightweight testing script or framework.
- **[Reliability/Math] Potential Division by Zero Edge Cases**
  - **Location**: `app.js` (Line 47, 81)
  - **Impact**: If `mean` in `calcBurstiness` evaluates to 0, `cv = std / mean` results in `NaN`, which bubbles up to the UI. The same applies to `totalWords` in `calcPerplexity`. While practically unreachable in the normal `splitSentences` path since it strips empty strings, extremely bizarre inputs might theoretically trigger it.
  - **Fix**: Add explicit zero-guards: `if (mean === 0) return { score: 0, ... }`.
- **[Documentation] Missing Developer Onboarding**
  - **Location**: `README.md`
  - **Impact**: The README focuses on user features but lacks instructions for developers (e.g., how to run a local dev server, how to contribute, or architectural explanations).
  - **Fix**: Add a "Developer Guide" section in `README.md` explaining how to serve the project locally (e.g., `npx serve`) and describing the heuristic logic.

## Evidence-Based Notes (Solid Areas)
*   **Architecture**: The zero-framework (Vanilla JS) setup is highly appropriate for this local heuristic teaching tool. It prevents dependency rot and keeps the bundle incredibly small (though it does rely on `../shared/loader.js`).
*   **Security**: The DOM updates correctly use `span.textContent = s;` instead of `innerHTML` for user-provided text, neutralizing XSS attack vectors.
*   **Offline Support**: The PWA implementation in `sw.js` with a Stale-While-Revalidate/Cache-First strategy is mostly robust and correctly avoids caching external or non-GET requests (note: it uses a global `journalism-tool-v1` cache name and points to some unused assets like `dark-toggle.js`, but functions well overall).