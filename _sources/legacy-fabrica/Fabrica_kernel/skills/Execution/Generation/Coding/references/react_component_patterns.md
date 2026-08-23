# React Component Patterns

## What
React component composition, hook design, state management, and Tailwind styling patterns for Fabrica UI components.

## When
Referenced by build mode's `component_rules.md` when building any new React component.

## Base Component Pattern
```tsx
// components/missions/MissionCard.tsx
import type { Mission } from '@/types'

interface MissionCardProps {
  mission: Mission
  onSelect: (id: string) => void
  isSelected?: boolean
}

export function MissionCard({ mission, onSelect, isSelected = false }: MissionCardProps) {
  return (
    <div
      onClick={() => onSelect(mission.id)}
      className={`
        cursor-pointer rounded-lg border p-3
        transition-all duration-200
        hover:scale-[1.01] hover:shadow-sm
        ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}
      `}
    >
      <h3 className="text-sm font-semibold text-gray-900">{mission.title}</h3>
      <p className="mt-1 text-xs text-gray-500">{mission.phase}</p>
    </div>
  )
}
```

## Skeleton Loading Pattern
```tsx
export function MissionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 p-3">
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
    </div>
  )
}
```

## Data Fetching Hook Pattern
```tsx
// hooks/useMissions.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/components/auth/supabase'
import type { Mission } from '@/types'

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/missions')
      const { data } = await res.json()
      setMissions(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { missions, loading }
}
```
