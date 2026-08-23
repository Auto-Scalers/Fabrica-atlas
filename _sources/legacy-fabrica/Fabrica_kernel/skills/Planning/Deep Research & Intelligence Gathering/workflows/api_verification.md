# API Verification

## What
Verifies exact API endpoint structures, authentication scopes, required and optional parameters, request/response payload shapes, and versioning requirements from retrieved official documentation.

## When
Triggered when any pipeline step requires integration with an external API or SDK (Supabase, Stripe, Odoo, Google Maps, n8n webhooks, etc.).

## Why
Incorrect endpoint assumptions cause build failures mid-execution. Verification here prevents wasted implementation cycles and catches breaking version changes before code is written.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Retrieved documentation | Array of doc excerpts | Agent: `official_source_query.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Verified API specs | JSON `{ endpoint, method, auth_type, required_params[], response_shape, version, notes }` per API | Agent: `snippet_extraction.md`, Calling pipeline step | â€” |


## Guidelines
1. Look for API deprecation warnings.
2. Verify response status codes.
3. Match routing schemas with standard guidelines.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Payload Hardening**: Verify exact header and payload keys.
2. **Tenant Isolation**: Confirm API route validates user permissions.
1. **Adhere to Scope**: Perform only operations defined in the api verification specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: official_source_query.md
- **Flows to**: snippet_extraction.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

