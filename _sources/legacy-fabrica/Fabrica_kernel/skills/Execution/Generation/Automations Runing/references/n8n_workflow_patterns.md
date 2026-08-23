# n8n Workflow Patterns

## What
n8n workflow JSON templates, webhook integration patterns, and error notification patterns for automations built via Fabrica.

## When
Referenced by build mode when any task involves creating, registering, or connecting an n8n automation workflow.

## Webhook Trigger Node
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "path": "fabrica-mission-trigger",
        "httpMethod": "POST",
        "responseMode": "lastNode",
        "options": {}
      }
    }
  ]
}
```

## HTTP Request Node (Calling Fabrica API)
```json
{
  "name": "Update Mission Status",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "parameters": {
    "method": "PATCH",
    "url": "=https://yourapp.com/api/missions/{{$json[\"mission_id\"]}}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        { "name": "status", "value": "execution" }
      ]
    }
  }
}
```

## Error Alert Pattern
```json
{
  "name": "Error Handler",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://yourapp.com/api/runtime/log-error",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        { "name": "source", "value": "n8n" },
        { "name": "error", "value": "={{$json[\"error\"][\"message\"]}}" },
        { "name": "workflow", "value": "={{$workflow.name}}" }
      ]
    }
  }
}
```

## Security Note
n8n webhook URLs and credentials are stored as environment variables on the Fabrica server. n8n must be configured to validate incoming webhook requests via header-based auth tokens.
