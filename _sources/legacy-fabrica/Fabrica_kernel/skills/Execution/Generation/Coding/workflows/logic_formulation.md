# Logic Formulation Protocol

## What
Rules for formulating server-side API handlers, business logic algorithms, and external service connectors.

## Rules
1. **Lazy Initialization**: Initialize heavy SDKs (Stripe, Gemini, Database connectors) lazily on first invocation.
2. **Error Handling**: Wrap business logic in robust try/catch blocks with informative error messages.
3. **Stateless Handlers**: Keep API route functions stateless to support horizontal execution scaling.
4. **Input Validation**: Validate incoming body and query parameters before processing business logic.
