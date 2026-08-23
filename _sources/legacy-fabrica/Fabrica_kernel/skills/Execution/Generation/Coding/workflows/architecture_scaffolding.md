# Architecture Scaffolding Protocol

## What
Rules for setting up clean project structures, directory layouts, and file scaffolding according to framework conventions (Next.js, Express, TypeScript).

## Rules
1. **Directory Convention**: Follow the standard app/ component directory structure without creating redundant sub-level folders.
2. **Relative File Paths**: All internal module imports must use clean, predictable relative paths or standard workspace aliases.
3. **Modular Separation**: Keep routes (`/api/*`), UI components (`components/`), and business services (`src/`) clearly separated.
4. **Environment Variables**: Define all external service keys in `.env.example` and consume them server-side only.
