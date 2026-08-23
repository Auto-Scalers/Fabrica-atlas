# Test Data Samples

## What
Sample data structures for realistic test scenarios across the main database tables.

## When
Referenced by test mode's `scenario_rules.md` when writing test scenarios that require realistic fixture data.

## Sample: Mission
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-test-001",
  "type": "system_build",
  "status": "drafting",
  "phase": "analytics_1",
  "title": "Customer Auto-Responder System",
  "objective": "Build an automated system that reads incoming customer support emails and generates context-aware responses using AI.",
  "input_data_ids": ["raw-data-uuid-001"],
  "system_ids": [],
  "qa_state": null,
  "workflow_history": null,
  "created_at": "2026-07-20T10:00:00Z",
  "updated_at": "2026-07-20T10:00:00Z"
}
```

## Sample: Raw Data
```json
{
  "id": "raw-data-uuid-001",
  "user_id": "user-test-001",
  "name": "customer_support_emails_q2.csv",
  "content": "date,from,subject,body\n2026-06-01,alice@example.com,Order #1234,Where is my order?...",
  "mime_type": "text/csv",
  "metadata": {
    "size_bytes": 45230,
    "tags": ["support", "emails", "q2-2026"],
    "row_count": 1847,
    "rag_indexed": false
  },
  "created_at": "2026-07-19T08:30:00Z"
}
```

## Sample: System Component
```json
{
  "id": "sys-comp-uuid-001",
  "user_id": "user-test-001",
  "name": "customer_auto_responder",
  "role": "auto-response-agent",
  "code_snapshot": "// src/routes/auto-respond.ts\nimport { Router } from 'express'...",
  "metadata": {
    "files_index": ["src/routes/auto-respond.ts", "src/services/email-processor.ts"],
    "dependencies": ["openai", "nodemailer"],
    "rag_indexed": false
  },
  "created_at": "2026-07-20T15:00:00Z"
}
```

## Sample: Tool
```json
{
  "id": "tool-uuid-001",
  "name": "supabase_mcp",
  "type": "mcp",
  "metadata": {
    "description": "MCP server for direct Supabase database operations",
    "role": "database-operator",
    "when_to_use": "Use when running SQL queries, schema migrations, or managing RLS policies directly",
    "triggers": ["database query", "schema change", "RLS setup"],
    "inputs": ["SQL query string", "table name", "user_id"],
    "outputs": ["query results", "migration status"],
    "maturity": "hardened",
    "active": true
  },
  "created_at": "2026-07-01T00:00:00Z"
}
```

## Edge Case Samples

### Empty Payload
```json
{}
```

### Maximum Length Strings
```json
{
  "title": "AAAAAAAAAAAAAAAAAAA... (200 chars)",
  "objective": "BBBBB... (2000 chars)"
}
```

### Wrong user_id (Cross-Tenant Attack)
```json
{
  "user_id": "different-user-uuid",
  "title": "Injected Mission"
}
```
