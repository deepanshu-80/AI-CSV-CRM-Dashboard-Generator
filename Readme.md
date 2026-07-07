# GrowEasy AI-Powered CSV Importer

An AI-powered CSV importer that intelligently maps any CSV format (Facebook Ads, Google Ads, Excel, Real Estate CRMs, Sales reports, etc.) into GrowEasy CRM leads using GeminiAI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/csv-importer run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages


## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Framer Motion, Tailwind CSS, shadcn/ui, next-themes
- API: Express 5 + multer (file upload) + csv-parse + OpenAI SDK

## Where Things Live

- `artifacts/csv-importer/src/` — React frontend (single-page app, 4-step flow)
- `artifacts/api-server/src/routes/csv.ts` — CSV upload + AI extraction routes
- `lib/api-client-react/src/generated/` — generated React Query hooks + TypeScript types

## Application Flow

1. **Upload** — drag & drop or file picker, CSV only
2. **Preview** — parsed CSV rows shown in a responsive table (no AI yet)
3. **Confirm** — user clicks "Run AI Import" button
4. **Results** — AI-extracted CRM records displayed with stats, colored badges, download option

## CRM Fields Extracted

`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, `description`

## AI Design

- Uses `gemini 2.5 model` with structured JSON output (`{ "records": [...] }`)
- Processes CSV rows in batches of 20
- 3 automatic retries per batch with exponential backoff
- Records missing both email and mobile are skipped with a reason

## Architecture Decisions

- Stateless design — no DB needed; file is held in memory during request
- `response_format: { type: "json_object" }` with a wrapper object ensures deterministic AI output (array inside `records` key)
- Multer error middleware catches file-type/size errors before route handlers and returns consistent JSON
- Google Fonts `@import` placed before Tailwind imports in CSS to satisfy PostCSS ordering


