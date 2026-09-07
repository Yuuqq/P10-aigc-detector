# Code Review: P10 AIGC 文本解构探测仪

## Summary
The P10 AIGC Detector features a commendable zero-dependency frontend architecture (pure HTML/CSS/JS). This ensures excellent longevity and maintainability for an educational tool. The local-only processing approach guarantees privacy and avoids complex backend infrastructure. However, there are significant gaps in test coverage and some algorithmic edge cases (performance and reliability) that need addressing.

## Findings

### HIGH
- **[Test Coverage] Missing Automated Tests**
  - **Location**: Entire Repository
  - **Impact**: The core logic (`calcBurstiness`, `calcPerplexity`, `splitSentences`) in `app.js` is completely untested. Any future improvements to the heuristic algorithms risk introducing silent regressions.
  - **Fix**: Introduce a lightweight testing framework (e.g., Jest or Vitest) and add unit tests specifically for the math/heuristic functions and text splitting logic.

### MEDIUM
- **[Performance] Inefficient Regex Compilation in Hot Loop**
  - **Location**: `app.js` (Line 52, `calcPerplexity`)
  - **Impact**: `new RegExp(cw, "g")` is instantiated inside a `.forEach` loop for *every* sentence and *every* cliché word. For longer texts (e.g., 2000+ words), this creates massive unnecessary garbage collection and CPU overhead, potentially freezing the main thread.
  - **Fix**: Pre-compile the regular expressions once outside the function, or combine the `CLICHE_WORDS` into a single global regex: `const CLICHE_REGEX = new RegExp([...CLICHE_WORDS].join('|'), 'g');`.
- **[Reliability] Regex splitting breaks on decimals/abbreviations**
  - **Location**: `app.js` (Line 29, `splitSentences`)
  - **Impact**: The regex `/([^。！？\.\!\?]+[。！？\.\!\?]?)/g` splits on any period. A number like "3.14" will be split into two "sentences" ("3." and "14"), artificially inflating the burstiness variance and skewing results.
  - **Fix**: Refine the regex to use negative lookbehinds/lookaheads (e.g., avoiding periods surrounded by digits) or use a more robust sentence tokenization library/heuristic.
- **[Maintainability] Hardcoded Heuristics**
  - **Location**: `app.js` (Line 13, `CLICHE_WORDS`)
  - **Impact**: The "Perplexity" detection relies entirely on a hardcoded Set of 28 Chinese transitional phrases. This is too simplistic for a real-world detector and hard to maintain or expand without bloating the main UI thread script.
  - **Fix**: Extract `CLICHE_WORDS` and heuristic parameters into a separate config file or JSON. Eventually, consider using a Web Worker to load a slightly larger n-gram dictionary without blocking the UI.

### LOW
- **[Reliability/Math] Potential Division by Zero Edge Cases**
  - **Location**: `app.js` (Line 38, 62)
  - **Impact**: If `mean` in `calcBurstiness` evaluates to 0, `cv = std / mean` results in `NaN`, which bubbles up to the UI. The same applies to `totalWords` in `calcPerplexity`. While `splitSentences` and `.filter(Boolean)` mitigate this for normal text, bizarre inputs (like strings entirely made of non-word zero-width characters) might still trigger it.
  - **Fix**: Add explicit zero-guards: `if (mean === 0) return { score: 0, ... }`.
- **[Documentation] Missing Developer Onboarding**
  - **Location**: `README.md`
  - **Impact**: The README focuses on user features but lacks instructions for developers (e.g., how to run a local dev server, how to contribute, or architectural explanations).
  - **Fix**: Add a "Developer Guide" section in `README.md` explaining how to serve the project locally (e.g., `npx serve`) and describing the heuristic logic.

## Evidence-Based Notes (Solid Areas)
*   **Architecture**: The choice of a zero-framework (Vanilla JS) setup is highly appropriate here. It prevents dependency rot and keeps the bundle incredibly small.
*   **Security**: The DOM updates use `span.textContent = s;` instead of `innerHTML` for user-provided text, correctly neutralizing XSS attack vectors.
*   **Offline Support**: The PWA implementation in `sw.js` with a Stale-While-Revalidate/Cache-First strategy is robust and correctly avoids caching external or non-GET requests.