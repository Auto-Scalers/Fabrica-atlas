# Interface Design Protocol

## What
Rules for designing strict TypeScript interfaces, database schemas, and contract payload types across full-stack applications.

## Rules
1. **Explicit Typing**: Define clear types for all requests, responses, and database entities; avoid `any`.
2. **Shared Payload Contracts**: Ensure API handler interfaces match the expectations of frontend components.
3. **Database Schema Types**: Mirror relational and document column types precisely in TypeScript interfaces.
4. **Immutable Enums**: Declare standard TypeScript `enum`s for fixed state and status parameters.
