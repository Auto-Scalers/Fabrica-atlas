---
name: Coding
description: Sub-skill for writing, refactoring, compiling, type-checking, and testing production-grade full-stack code under Deliverables/Executions.
---

# Sub-Skill: Coding

## 1. Overview & Universal Context
This sub-skill operates under **Execution/Generation**. It handles full-stack software development, React/Next.js UI components, Node/Express API routes, database schemas, and unit tests, registering output codebases in **Deliverables / Executions**.

## 2. Operational Rules & Subroutines
1. **Spec Ingestion**: Ingest code specifications, API route schemas, and component architecture blueprints.
2. **Surgical Code Execution**: Write clean TypeScript code, execute lint checks (`npm run lint`), and build verification (`compile_applet`).
3. **Registration**: Save code modules into **Deliverables / Executions**.

## 3. Sub-Domain Modules
- `./domains/fullstack_scaffolding.md` (Frontend components, backend API routes, database migrations)


## 5. Workflows, Rules & References
### Workflows
- **`./workflows/architecture_scaffolding.md`**: Initial project directory scaffolding, configuration setup, and modular layout.
- **`./workflows/build_verification.md`**: Pre-compilation and build integrity verification checks.
- **`./workflows/component_synthesis.md`**: Generating modular UI components and reusable design primitives.
- **`./workflows/logic_formulation.md`**: Writing core business logic, algorithms, and state management controllers.

### Rules
- **`./rules/impact_mapping_rules.md`**: Mapping cross-module dependencies before making code changes.
- **`./rules/performance_rules.md`**: Rendering optimization, memory management, and bundle footprint rules.
- **`./rules/refactoring_checklists.md`**: Step-by-step checklists for safe code refactoring.
- **`./rules/refactoring_rules.md`**: Guidelines for clean code restructuring without breaking external APIs.
- **`./rules/regression_rules.md`**: Safeguarding existing functionality against regression bugs.
- **`./rules/security_rules.md`**: Input sanitization, authentication handling, and secret protection rules.

### References
- **`./references/caching_patterns.md`**: Standard caching strategies (LRU, Redis, SWR, HTTP caching).
- **`./references/express_route_patterns.md`**: Express.js REST API route controllers and middleware patterns.
- **`./references/interface_design.md`**: Clean API contract and TypeScript interface design.
- **`./references/nextjs_structure.md`**: Next.js App Router and Pages Router architectural patterns.
- **`./references/odoo_integration.md`**: Odoo ERP integration and module development patterns.
- **`./references/query_optimization.md`**: SQL and NoSQL query optimization and indexing strategies.
- **`./references/react_component_patterns.md`**: Modern React functional component and custom hook patterns.
- **`./references/security_patterns.md`**: Common security hardening patterns (OWASP Top 10 mitigation).
- **`./references/supabase_query_patterns.md`**: Supabase client and server database querying patterns.
- **`./references/typescript_patterns.md`**: Advanced TypeScript type definitions, generics, and utility types.
