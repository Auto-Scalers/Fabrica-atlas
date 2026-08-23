# Delivery Sub-Domain: Delivery Review & Sign-off

## Subroutines
1. **Release Notes Generation**: Summarize key features, changes, and verification test results.
2. **User Feedback Ingestion & Custom Entry Selection**: Capture user suggestions, bug reports, or modification requests. Allow selecting a Custom Entry loop (e.g. Drafting, Planning, Execution) to resume processing from that point based on feedback. If no custom entry is selected, default to continuing the full Execution loop.
3. **Completion Promotion & Work Relocation**:
   - **If Accepted**: Transfer finalized assets from `Deliverables/Reviews` to `Deliverables/Completed` and trigger database sync.
   - **If Feedback / Not Accepted**: Work is **ALWAYS moved to Deliverables/Executions** and processing continues from the selected entry (or default Execution loop).
