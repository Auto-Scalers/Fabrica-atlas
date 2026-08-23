# Search Strategy Guide

## What
Strategies and techniques for effective documentation and web searching during deep research cycles.

## When
Referenced by `keyword_generation.md` and `official_source_query.md` to improve search precision and avoid wasted queries.

## Strategies

### 1. Site-Scoped Search
Always scope web searches to the official domain first:
```
site:supabase.com/docs row level security
site:nextjs.org/docs app router
```

### 2. Version-Pinned Search
Always include the major version number when searching for APIs:
```
supabase-js v2 select filter user_id
express 4.x middleware error handling
```

### 3. Boolean Operator Patterns
Use AND/OR/NOT operators for precision:
```
supabase AND "row level security" AND typescript
odoo "json-rpc" AND "res.partner" NOT deprecated
```

### 4. Exact Phrase Matching
Use quotes for exact technical terms:
```
"createClient" "from" "@supabase/supabase-js"
"useEffect" "cleanup" react hooks
```

### 5. Changelog & Migration Searching
When a snippet is suspected to be deprecated:
```
supabase-js v2 migration guide breaking changes
nextjs 14 app router vs pages router
```

### 6. Error Message Searching
When debugging an error, search the exact error message string in quotes:
```
"Cannot read properties of undefined (reading 'auth')"
"PGRST116" supabase
```
