# API Development Guidelines

## ⚠️ CRITICAL: Supabase Client Usage

### ✅ CORRECT Way (Always Use This)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('your_table')
    .select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
```

### ❌ WRONG Way (DO NOT USE)

```typescript
// ❌ DO NOT DO THIS - Will cause build errors on Vercel
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## Why This Matters

### The Problem
- Creating Supabase client directly in route files causes **build-time errors** on Vercel
- Error: `supabaseUrl is required`
- Environment variables may not be available during the build phase
- Breaks deployment even though it works locally

### The Solution
- Always use the centralized `supabaseAdmin` from `/lib/supabaseAdmin.ts`
- This file properly handles environment variables
- Works consistently in development AND production
- Single source of truth for Supabase configuration

## Standard API Route Template

### Basic GET Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    let query = supabaseAdmin.from('table_name').select('*');
    
    if (id) {
      query = query.eq('id', id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Basic POST Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field1, field2 } = body;

    // Validation
    if (!field1 || !field2) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('table_name')
      .insert({ field1, field2 })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Basic PUT Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('table_name')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Basic DELETE Endpoint

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const { error } = await supabaseAdmin
      .from('table_name')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Best Practices

### 1. Always Import from Centralized Client
```typescript
✅ import { supabaseAdmin } from '@/lib/supabaseAdmin';
❌ import { createClient } from '@supabase/supabase-js';
```

### 2. Use Consistent Error Handling
```typescript
try {
  // Your code here
} catch (error) {
  console.error('API error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### 3. Validate Input Data
```typescript
// Validate required fields
if (!requiredField) {
  return NextResponse.json(
    { error: 'Missing required field' },
    { status: 400 }
  );
}
```

### 4. Log Errors for Debugging
```typescript
if (error) {
  console.error('Database error:', error); // Helps with debugging
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

### 5. Use Proper HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

### 6. Return Consistent Response Format
```typescript
// Success
return NextResponse.json(data);

// Error
return NextResponse.json(
  { error: 'Error message' },
  { status: 400 }
);
```

## Common Patterns

### Query with Filters
```typescript
let query = supabaseAdmin.from('table_name').select('*');

if (filter1) query = query.eq('field1', filter1);
if (filter2) query = query.gte('field2', filter2);
if (filter3) query = query.lte('field3', filter3);

query = query.order('created_at', { ascending: false });

const { data, error } = await query;
```

### Query with Joins
```typescript
const { data, error } = await supabaseAdmin
  .from('main_table')
  .select(`
    *,
    related_table:related_table_id(name, email),
    another_table(id, title)
  `)
  .eq('id', id)
  .single();
```

### RPC (Remote Procedure Call)
```typescript
const { data, error } = await supabaseAdmin
  .rpc('function_name', {
    param1: value1,
    param2: value2
  });
```

### Upsert (Insert or Update)
```typescript
const { data, error } = await supabaseAdmin
  .from('table_name')
  .upsert({
    id: existingId, // If exists, update; otherwise insert
    field1: value1,
    field2: value2
  })
  .select()
  .single();
```

## File Structure

```
app/
  api/
    resource-name/
      route.ts          # GET (list), POST (create)
      [id]/
        route.ts        # GET (single), PUT (update), DELETE (delete)
```

## Environment Variables

### Required Variables
These must be set in `.env.local` (development) and Vercel (production):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Checking `/lib/supabaseAdmin.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
```

## Checklist for New API Routes

- [ ] Import `supabaseAdmin` from `@/lib/supabaseAdmin`
- [ ] Use `try/catch` for error handling
- [ ] Validate input parameters
- [ ] Log errors with `console.error`
- [ ] Return proper HTTP status codes
- [ ] Test locally before deploying
- [ ] Verify build succeeds: `npm run build`

## Common Errors and Solutions

### Error: "supabaseUrl is required"
**Cause**: Creating Supabase client directly in route file  
**Solution**: Use `supabaseAdmin` from `/lib/supabaseAdmin.ts`

### Error: Build fails but dev works
**Cause**: Environment variables not available at build time  
**Solution**: Use centralized client, check Vercel env vars

### Error: CORS issues
**Cause**: Incorrect headers or route configuration  
**Solution**: Next.js API routes handle CORS automatically, no extra config needed

## Summary

🔑 **Golden Rule**: Always use `import { supabaseAdmin } from '@/lib/supabaseAdmin'` for all API routes

This ensures:
- ✅ Consistent Supabase configuration
- ✅ Successful builds in development and production
- ✅ Proper environment variable handling
- ✅ No deployment issues on Vercel
- ✅ Easy to maintain and debug

---

**Last Updated**: October 21, 2025  
**Next Review**: When adding new API endpoints
