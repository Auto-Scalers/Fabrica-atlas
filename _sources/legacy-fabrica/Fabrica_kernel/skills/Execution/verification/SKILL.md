---
name: verification
description: Verification skill for cross-referencing generated execution outputs against Strategic Synthesis requirements, auditing correctness, and promoting items to Deliverables/Reviews or looping back.
---

# Sub-Skill: Verification (Execution Stage)

## 1. Overview & Universal Context
This skill operates inside the **Verification** phase of the **Execution** stage in the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to cross-reference items generated in **Deliverables / Executions** against requirements defined in **Sources / Strategic Synthesis & Decision Support**, ensuring complete alignment without gaps.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 3: Execution (Verification phase inside Execution stage).
- **Inputs**: **Sources / Strategic Synthesis & Decision Support** + **Deliverables / Executions**.
- **Outputs**: Audit verdict (PASS/FAIL), gap analysis log, and item status promotion.

## 3. Step-by-Step Workflow & Feedback Loop
1. **Cross-Reference Audit**: Compare generated code, visual assets, or automations in **Deliverables / Executions** against specs in **Sources / Strategic Synthesis & Decision Support**.
2. **Gap & Compliance Verification**: Check for missing features, type errors, broken routes, or unfulfilled constraints.
3. **Loop Routing Decision**:
   - **IF NOT OK (Gaps Found)**: Generate detailed verification feedback notes and re-trigger the **Execution Generation** loop for self-repair.
   - **IF OK (Verified Pass)**: Promote the verified deliverable item directly from **Deliverables / Executions** to **Deliverables / Reviews**.

## 4. Dynamic Skill Routing & Domain Mappings
During verification, the AI Agent dynamically routes subroutines based on item type:

- **Verification Audit**: `./domains/validation_audit.md` (Code linting, compile check, spec matching audit)


## 5. Workflows, Rules & References
### Rules
- **`./rules/compiler_rules.md`**: Strict TypeScript and compiler verification rules.
- **`./rules/rls_rules.md`**: Row Level Security (RLS) policy validation rules.
- **`./rules/scenario_rules.md`**: Defining comprehensive test scenarios and edge cases.
- **`./rules/scope_rules.md`**: Testing within defined functional scope boundaries.
- **`./rules/validation_rules.md`**: Validation rules for API schemas, form inputs, and payloads.

### References
- **`./references/jest_vitest_setup.md`**: Jest and Vitest configuration and runner setup.
- **`./references/mock_patterns.md`**: Mocking external APIs, databases, and service dependencies.
- **`./references/rls_test_patterns.md`**: Testing patterns for Supabase and Postgres Row Level Security policies.
- **`./references/test_data_samples.md`**: Sample fixtures and seed data generators for testing.
