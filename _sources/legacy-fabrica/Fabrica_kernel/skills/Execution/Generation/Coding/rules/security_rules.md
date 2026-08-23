# Security Rules

## What
Rules for security hardening â€” environment key isolation, user input sanitization, SQL injection prevention, RLS enforcement, and graceful degradation when credentials are missing.

## When
Applied whenever code interacts with external APIs, user-supplied inputs, environment variables, or database queries.

## Why
Security vulnerabilities are the highest-risk class of defect. They cannot be patched retroactively without user impact. Every external touchpoint is a potential attack surface.

## Guidelines
1. Validate parameters using Zod schemas.
2. Ensure RLS filters by user_id on every query.
3. Implement grace periods for API authentication.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Server Isolation**: Keep API keys and credentials server-side.
2. **SQL parameterized**: Use parameterized queries; never concatenate inputs.
1. **Keys Server-Side Only**: No API key, secret, or database credential ever reaches the client-side browser. All external API calls proxy through `/api/*` server routes.
2. **Validate All Inputs**: Every user-supplied field is validated for type, length, and format before it touches a database query or business logic function.
3. **Parameterized Queries**: Never concatenate user input into SQL strings. Always use parameterized queries or the Supabase client's built-in safe methods.
4. **Graceful Key Degradation**: If an environment variable is missing at runtime, log a `[WARN]` and disable only the affected integration â€” do not crash the server.
5. **RLS on Every Table**: Every database table has a Row-Level Security policy enforcing `user_id` isolation. No query runs without an explicit `user_id` filter.
6. **Least Privilege**: API scopes and database roles are granted the minimum permissions required for the operation â€” never admin credentials for read operations.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Code under review | File contents | Agent: phase-execution.md | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Hardened code | Modified file contents | Agent: phase-execution.md | â€” |


## Handoffs
- **Flows from**: refactoring_rules.md
- **Flows to**: performance_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the optimization loop

