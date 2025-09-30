# Granite Customer Ledger — Next.js + Supabase (Vercel-ready)

This repo is a **fully wired MVP**:
- Next.js (App Router) + Tailwind
- API routes (server-only) using **Supabase Service Role**
- Client dashboard with filters, charts, forms and **Export to Excel**

## 1) Create Supabase project (Free)
1. Go to https://supabase.com → New Project.
2. Copy **Project URL** and **Service Role Key** (Settings → API).
3. Open **SQL** and run `supabase/schema.sql` from this repo.

## 2) Configure Vercel project
1. Import this repo in Vercel (New Project → From Git).
2. Set **Environment Variables** (Project → Settings → Environment Variables):
   - `SUPABASE_URL` = your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE` = your Supabase Service Role key
   - (Optional) `BASIC_USER` / `BASIC_PASS` to enable basic auth gate
3. Deploy. (Next auto-detected. Nothing else to set.)

> Security: API routes use the **Service Role key on the server only**. No DB secrets in the browser.

## 3) Local development (optional)
```bash
npm i
npm run dev
```
Create a `.env.local` with:
```
SUPABASE_URL=...your...
SUPABASE_SERVICE_ROLE=...your...
# BASIC_USER=demo
# BASIC_PASS=demo123
```

## 4) Using the app
- Add a customer (unique constraint enforced).
- Add consignments (expected totals and split).
- Add transactions (RTGS/CASH) with account mapping.
- Filter by customer and date range.
- Export to Excel → 3 sheets (Summary, Consignments, Transactions).

## 5) Moving to AWS later
Because DB access is isolated in **/app/api/**:
- Replace these routes with **AWS Lambda** behind **API Gateway**.
- Point them to **Aurora PostgreSQL** with the same schema (pg_dump/pg_restore from Supabase).
- Frontend stays the same (calls `/api/...` endpoints).

## 6) Notes
- Security headers are enabled in `next.config.js`. CSP allows SheetJS CDN (for Excel fallback).
- Minimal UI components in `components/ui/*` avoid external UI kits. Tailwind powers layout & spacing.


## SheetJS (xlsx)
Pinned to **0.20.3** from the official CDN to avoid npm registry issues. If you update:
```
npm i --save https://cdn.sheetjs.com/xlsx-0.20.4/xlsx-0.20.4.tgz
```
Also update the fallback URL in `app/page.tsx` to the same version:
```
https://cdn.sheetjs.com/xlsx-0.20.4/package/dist/xlsx.full.min.js
```
