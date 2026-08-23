# Odoo Integration

## What
Odoo JSON-RPC and XML-RPC integration patterns for connecting to Odoo ERP systems from the Fabrica Express server.

## When
Referenced by build mode during any task that requires Odoo ERP connectivity (customer data, sales orders, inventory, partner records).

## JSON-RPC Connection Pattern
```typescript
// src/lib/odoo.ts
interface OdooConfig {
  url: string      // e.g., 'https://yourcompany.odoo.com'
  db: string       // Odoo database name
  username: string // login email
  password: string // API key or password
}

async function odooCall(config: OdooConfig, model: string, method: string, args: any[], kwargs: any = {}) {
  // Step 1: Authenticate
  const authRes = await fetch(`${config.url}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: {
        model: 'res.users',
        method: 'authenticate',
        args: [config.db, config.username, config.password, {}],
        kwargs: {}
      }
    })
  })
  const { result: uid } = await authRes.json()
  if (!uid) throw new Error('Odoo authentication failed')

  // Step 2: Call model method
  const res = await fetch(`${config.url}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 2,
      params: { model, method, args: [[uid, config.password], ...args], kwargs }
    })
  })
  const { result, error } = await res.json()
  if (error) throw new Error(error.message)
  return result
}

// Example: Fetch partners
const partners = await odooCall(config, 'res.partner', 'search_read',
  [[['customer_rank', '>', 0]]],
  { fields: ['id', 'name', 'email', 'phone'], limit: 100 }
)
```

## Security Note
Odoo credentials (url, db, username, password/api_key) must be stored as environment variables. Never expose them to the client-side browser. All Odoo calls must proxy through `/api/*` server routes.
