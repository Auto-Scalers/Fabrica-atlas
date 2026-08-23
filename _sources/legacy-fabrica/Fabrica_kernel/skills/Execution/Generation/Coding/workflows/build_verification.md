# Build Verification Protocol

## What
Rules for verifying syntax integrity, import path correctness, and module exports before compilation.

## Rules
1. **Import Verification**: Check that all imported files, modules, and dependencies exist and are exported correctly.
2. **Type Checking**: Verify that prop types and method call signatures pass TypeScript type checks.
3. **Clean Code Generation**: Ensure generated files contain no unused or broken code fragments.
