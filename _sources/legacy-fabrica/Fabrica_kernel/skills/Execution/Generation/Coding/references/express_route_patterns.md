# Express Route Patterns

## What
Standard Express.js route structure, middleware ordering, error handling, and authentication guard patterns for the Fabrica server.

## When
Referenced by build mode's `api_route_rules.md` when writing any new Express route file.

## Standard Route File Structure
```typescript
// src/routes/missions.ts
import { Router, Request, Response } from 'express'
import { getMissions, createMission, updateMission } from '../services/missions'
import { validateUser } from '../middleware/auth'

const router = Router()

// GET /api/missions
router.get('/', validateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const data = await getMissions(userId)
    res.json({ data, error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/missions
router.post('/', validateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { title, objective, type } = req.body
    if (!title || !type) {
      return res.status(400).json({ data: null, error: 'title and type are required' })
    }
    const data = await createMission(userId, { title, objective, type })
    res.status(201).json({ data, error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

export default router
```

## Auth Middleware Pattern
```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../components/auth/supabase'

export async function validateUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ data: null, error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ data: null, error: 'Invalid token' })

  req.user = user
  next()
}
```

## Server Registration Pattern
```typescript
// server.ts — Register all routes
import missionsRouter from './src/routes/missions'
import rawDataRouter from './src/routes/raw-data'

app.use('/api/missions', missionsRouter)
app.use('/api/raw-data', rawDataRouter)
```
