# Next.js Structure

## What
Next.js project organization patterns, page routing conventions, static asset handling, and API proxy patterns for the Fabrica frontend.

## When
Referenced by build mode's `scaffold_rules.md` and `component_rules.md` when setting up or extending the Next.js frontend.

## Directory Structure
```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (fonts, global providers)
│   ├── page.tsx                 # Home / dashboard
│   └── (mission)/
│       └── [id]/
│           └── page.tsx         # Mission detail page
├── components/
│   ├── ui/                      # Base UI primitives (Button, Card, Badge)
│   ├── panels/                  # Panel-level components (PanelA, PanelB, PanelC)
│   └── missions/                # Mission-specific components (MissionCard, MissionOverlay)
├── hooks/                       # Custom React hooks (useMissions, useRawData)
├── lib/
│   ├── supabase-browser.ts      # Browser-safe Supabase client (anon key)
│   └── utils.ts                 # Shared utility functions
└── types/                       # Shared TypeScript types
```

## Client-Side Supabase (Browser)
```typescript
// src/lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Static Export Config (for Express serving)
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",               // Static HTML/CSS/JS (default output folder is 'out')
  images: { unoptimized: true }
};

export default nextConfig;
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — exposed to browser (anon operations)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — exposed to browser
- `SUPABASE_SERVICE_ROLE` — server-side only, never in NEXT_PUBLIC_*
