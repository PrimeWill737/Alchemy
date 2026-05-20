# CRM Platform (Next.js + SCSS)

Modern CRM scaffold built with Next.js App Router, TypeScript, and SCSS architecture.

## Tech Stack

- Frontend: Next.js, TypeScript, SCSS Modules, Zustand
- Forms & Validation: React Hook Form, Zod
- Data/HTTP: Axios
- Charts: Recharts
- Animation/Realtime foundations: Framer Motion, Socket.io Client
- API layer: Next.js route handlers (REST scaffolding)

## Implemented Roadmap Phases

### Phase 1 - Foundation

- Next.js App Router project initialized
- TypeScript + ESLint configured
- SCSS architecture created under `src/styles`
- Alias support enabled (`@/*`)
- Core folder structure created (`components`, `services`, `hooks`, `store`, `lib`, `types`, `utils`)
- Landing page added at `/` with premium marketing UI

### Phase 2 - Authentication

- Auth route created at `/auth`
- Login form built with React Hook Form + Zod validation
- API login endpoint scaffolded at `/api/auth/login`
- Session wiring points documented and ready for Auth.js integration
- Explicit two-layer admin model shown in UI: `Super Admin` and `Admin`

### Phase 3 - Dashboard

- Dashboard shell layout with navbar + sidebar
- KPI widgets (leads/tasks/deals/pipeline value)
- Activity feed and forecast cards

### Phase 4 - Leads Management

- Leads module page and table
- Lead creation form with validation
- Zustand store integration for adding leads
- API scaffolding:
  - `GET /api/leads`
  - `POST /api/leads`
  - `PUT /api/leads/:id`
  - `DELETE /api/leads/:id`

### Phase 5 - Customer Management

- Customer module page with customer table
- Segmentation panel
- API scaffolding:
  - `GET /api/customers`
  - `POST /api/customers`
  - `PUT /api/customers/:id`
  - `DELETE /api/customers/:id`

### Phase 6 - Sales Pipeline

- Pipeline module page with kanban-style stage columns
- Deals rendered by stage from typed mock data
- API scaffolding:
  - `GET /api/deals`
  - `POST /api/deals`
  - `PUT /api/deals/:id`
  - `DELETE /api/deals/:id`

### Phase 7 - Tasks & Activities

- Tasks page with status updates
- Interactive tasks table
- Reminder panel
- API scaffolding:
  - `GET /api/tasks`
  - `POST /api/tasks`
  - `PUT /api/tasks/:id`
  - `DELETE /api/tasks/:id`

### Phase 8 - Communication

- Messaging module at `/messages`
- API scaffolding:
  - `GET /api/messages`

### Phase 9 - Reports & Analytics

- Reports page with revenue trend chart (Recharts)
- Export panel
- API scaffolding:
  - `GET /api/reports`

### Phase 10 - AI Features (Advanced Layer)

- AI assistant route at `/ai-assistant`
- AI feature flag listing + insight preview scaffold

## Additional Core Modules Implemented

- Team Management: `/team`
- Notifications: `/notifications`
- Settings: `/settings`

## Folder Overview

```txt
src/
├── app/
│   ├── api/
│   ├── ai-assistant/
│   ├── auth/
│   ├── customers/
│   ├── dashboard/
│   ├── leads/
│   ├── messages/
│   ├── notifications/
│   ├── pipeline/
│   ├── reports/
│   ├── settings/
│   ├── tasks/
│   └── team/
├── components/
│   ├── charts/
│   ├── forms/
│   ├── layout/
│   ├── tables/
│   └── ui/
├── hooks/
├── lib/
├── services/
├── store/
├── database/
├── styles/
├── types/
└── utils/
```

## SCSS Architecture

```txt
src/styles/
├── abstracts/
├── base/
├── components/
├── layouts/
├── pages/
├── themes/
└── main.scss
```

## Run The Project

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## PostgreSQL Schema

The SQL schema is available at:

- `database/schema.sql`

Apply it with:

```bash
psql -U <user> -d <database> -f database/schema.sql
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Next Production Steps

- Replace mock database (`src/lib/mock-db.ts`) with PostgreSQL + Prisma
- Add Auth.js with secure session and refresh token handling
- Add RBAC guards at route and API level
- Add Redis caching + BullMQ jobs
- Connect real providers for email/SMS/WhatsApp
- Add tests (unit + integration + e2e)
