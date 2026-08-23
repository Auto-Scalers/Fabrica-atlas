# Reference: Standard Maintenance Checklist

## Overview
This reference checklist outlines standard operational steps for recurring system maintenance, background health checks, and routine cleanup tasks.

## 1. Code & Build Health
- [ ] Run codebase linter (`npm run lint`) to detect formatting or type regressions.
- [ ] Verify build compilation (`compile_applet`) to ensure zero compile-time errors.
- [ ] Check for deprecated package imports or unresolved dependency warnings.

## 2. Data & Storage Audit
- [ ] Audit local cache and ephemeral storage footprint.
- [ ] Verify database connectivity and schema synchronization.
- [ ] Ensure stale temporary logs or orphaned test files are safely purged.

## 3. Configuration & Security
- [ ] Validate environment variable declarations against `.env.example`.
- [ ] Confirm that no sensitive API keys or credentials are exposed in client-side bundles.
- [ ] Verify correct permission headers and iframe capability settings in `metadata.json`.
