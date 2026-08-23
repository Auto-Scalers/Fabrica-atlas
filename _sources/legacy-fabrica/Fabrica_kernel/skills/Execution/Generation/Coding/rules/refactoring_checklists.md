# Refactoring Checklists

## What
Step-by-step checklists for the most common refactoring scenarios encountered during system optimization.

## When
Referenced by optimization mode's `refactoring_rules.md` when executing a specific type of refactoring task.

## Checklist 1: Extract Repeated Logic to Shared Utility
- [ ] Identify all locations where the duplicated logic exists (grep search)
- [ ] Verify all instances are functionally identical (or note differences)
- [ ] Create utility function in `src/lib/` or `src/utils/`
- [ ] Replace first instance with utility call — run lint + compile
- [ ] Replace remaining instances one by one — run lint + compile after each
- [ ] Verify no behavioral change by running relevant tests

## Checklist 2: Refactor Route to Service Layer
- [ ] Read the full route handler
- [ ] Identify business logic (everything that is not input validation or HTTP response)
- [ ] Create `src/services/<domain>.ts` with a typed service function
- [ ] Move business logic into service function
- [ ] Route handler calls service, service returns typed result
- [ ] Run lint + compile — no new errors
- [ ] Verify route behavior is identical via test

## Checklist 3: Add Try/Catch to Unguarded Async Function
- [ ] Identify all `async` functions without try/catch
- [ ] Wrap body in `try { ... } catch (err) { ... }`
- [ ] In catch: log the error with `[ERR]` notation, return a safe fallback
- [ ] Do not swallow errors silently — always log
- [ ] Run lint + compile

## Checklist 4: JSONB Field Patch (Safe Write)
- [ ] Read current row from database
- [ ] Verify the field exists and has expected structure
- [ ] Construct the new value (do not overwrite adjacent JSONB keys)
- [ ] Write only the target field: `.update({ target_field: newValue })`
- [ ] Verify adjacent fields are unchanged after write
