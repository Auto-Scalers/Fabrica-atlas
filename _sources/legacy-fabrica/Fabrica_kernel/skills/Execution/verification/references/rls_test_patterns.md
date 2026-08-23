# RLS Test Patterns

## What
Test patterns for verifying Row-Level Security isolation between tenants in Supabase.

## When
Referenced by test mode's `rls_rules.md` whenever a database table or RLS policy is added or modified.

## Pattern 1: Cross-Tenant Read Isolation
```typescript
describe('missions RLS — read isolation', () => {
  const USER_A = 'user-a-uuid'
  const USER_B = 'user-b-uuid'

  it('user B cannot read user A missions', async () => {
    // Insert a mission as user A (using service role for test setup)
    const { data: missionA } = await supabaseAdmin
      .from('missions')
      .insert({ user_id: USER_A, title: 'User A Mission', type: 'standard', status: 'drafting', phase: 'analytics_1' })
      .select().single()

    // Attempt to read as user B (using user B's auth client)
    const { data } = await supabaseUserB
      .from('missions')
      .select('*')
      .eq('id', missionA!.id)

    expect(data).toHaveLength(0) // RLS blocks the read — returns empty, not error
  })
})
```

## Pattern 2: Cross-Tenant Write Block
```typescript
it('user B cannot update user A mission', async () => {
  const { error } = await supabaseUserB
    .from('missions')
    .update({ title: 'Hijacked' })
    .eq('id', missionA!.id)

  expect(error).not.toBeNull() // Write must be blocked
})
```

## Pattern 3: Cascading Delete Verification
```typescript
it('deleting user A deletes their missions', async () => {
  await supabaseAdmin.auth.admin.deleteUser(USER_A)

  const { data } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('user_id', USER_A)

  expect(data).toHaveLength(0) // Cascade delete confirmed
})
```

## Test Client Setup
```typescript
// Two separate clients — one per simulated tenant
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY) // Bypasses RLS for setup
const supabaseUserA = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${USER_A_JWT}` } } })
const supabaseUserB = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${USER_B_JWT}` } } })
```
