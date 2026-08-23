---
name: pipeline_Delivering_Review
description: Final Review & Delivery skill for presenting verified deliverables in Deliverables/Reviews to the user, capturing human feedback, and promoting accepted items to Deliverables/Completed.
---

# Pipeline Sub-Skill: Delivering Review (Delivering Stage)

## 1. Overview & Universal Context
This skill operates inside the **Delivering** stage of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to present verified production deliverables in **Deliverables / Reviews** to the human operator for final review, handle feedback loops, and promote accepted work to **Deliverables / Completed**.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 4: Delivering (Non-loop stage for final delivery sign-off).
- **Inputs**: Verified items sitting in **Deliverables / Reviews**.
- **Outputs**: Finalized production assets in **Deliverables / Completed** OR feedback payload routed back to **Deliverables / Executions**.

## 3. Step-by-Step Workflow & Feedback Loop
1. **Present Deliverable for Review**: Format release notes, key changes, and verification proof for items sitting in **Deliverables / Reviews**.
2. **User Gate Check & Review Handling**:
   - **IF USER ACCEPTS**: Promote deliverable from **Deliverables / Reviews** to **Deliverables / Completed**, log final release event, and archive mission state.
   - **IF USER PROVIDES FEEDBACK (Not Accepted)**:
     - **Work Relocation**: Work is **ALWAYS moved to Deliverables / Executions** when review is not accepted.
     - **Custom Entry Loop Selection**: The user may optionally select a **Custom Entry** (any loop or stage feedback entry point, e.g. Drafting/Discovery, Planning/Strategic Synthesis, or Execution) to continue processing the full loop from that entry point based on their feedback.
     - **Default Loop**: If no custom entry is selected by the user, the default behavior is to continue processing the full **Execution loop** based on their feedback.

## 4. Dynamic Skill Routing & Domain Mappings
During review, the AI Agent dynamically routes subroutines based on delivery format:

- **Delivery Review & Sign-Off**: `./domains/delivery_review.md` (Release notes generation, acceptance checklist, feedback routing)
