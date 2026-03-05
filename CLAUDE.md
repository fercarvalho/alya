# CLAUDE.md — Alya Financial Management System

> This file provides AI assistants (Claude, Copilot, etc.) with the context needed to work effectively on this codebase.

---

## Project Overview

**Alya** is a complete financial management system built for a candle e-commerce business. It provides:

- Dashboard with real-time financial metrics
- Transaction management (revenues & expenses)
- Product catalog and inventory control
- Client management
- Financial reports with interactive charts (Recharts)
- DRE (Demonstração do Resultado do Exercício — Income Statement)
- Revenue projections and forecasting
- Data import/export (Excel `.xlsx` files)
- Multi-user admin panel with role-based access control (RBAC)

**Language:** All code comments, UI text, variable names, and documentation are written in **Brazilian Portuguese**.

**Production URL:** `alya.sistemas.viverdepj.com.br`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 7 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| PDF Export | jsPDF + html2canvas |
| Date Utilities | date-fns |
| State Management | React Context API + custom hooks |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (migrated from JSON files) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Uploads | Multer |
| Excel I/O | xlsx |
| Email | SendGrid (optional) |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |

---

## Repository Structure

```
alya/
├── src/                        # Frontend React/TypeScript application
│   ├── App.tsx                 # Main app component (~6,700 lines) — routing + dashboard logic
│   ├── main.tsx                # React entry point, ErrorBoundary, Service Worker registration
│   ├── index.css               # Global styles
│   ├── components/             # UI components
│   │   ├── Dashboard.tsx       # Main dashboard with financial metrics
│   │   ├── Transactions.tsx    # Transaction CRUD
│   │   ├── Products.tsx        # Product catalog
│   │   ├── Reports.tsx         # Charts and report views
│   │   ├── Clients.tsx         # Client management
│   │   ├── DRE.tsx             # Income Statement (DRE)
│   │   ├── Projection.tsx      # Revenue projection
│   │   ├── ProjectionImpgeo.tsx# Advanced Impgeo-style projection
│   │   ├── AdminPanel.tsx      # Admin panel (lazy loaded)
│   │   ├── Login.tsx           # Authentication UI
│   │   ├── admin/              # Admin-only sub-components
│   │   │   ├── UserManagement.tsx
│   │   │   ├── ModuleManagement.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   └── Statistics.tsx
│   │   ├── modals/             # Modal dialogs
│   │   └── projection/         # Projection charts and data builders
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Auth state, JWT handling, login/logout
│   │   ├── ProductContext.tsx  # Product state
│   │   └── TransactionContext.tsx # Transaction state
│   ├── hooks/
│   │   ├── useModules.ts       # System modules + user permission filtering
│   │   └── usePermissions.ts   # RBAC capabilities per role
│   ├── utils/
│   │   ├── dateUtils.ts        # Date parsing (timezone-safe parseLocalDate)
│   │   ├── validation.ts       # Email validation (RFC 5322)
│   │   ├── cpfMask.ts          # CPF formatting
│   │   ├── phoneMask.ts        # Phone formatting
│   │   ├── cepMask.ts          # Postal code formatting
│   │   ├── avatarUtils.ts      # Avatar processing
│   │   └── imageProcessor.ts  # Image upload processing
│   ├── config/
│   │   └── api.ts              # API base URL (auto-detects localhost vs. production)
│   ├── lib/
│   │   └── database.ts         # Frontend API call utilities
│   └── types/
│       ├── index.ts            # TypeScript type definitions
│       └── modules.d.ts        # Third-party module declarations
│
├── server/                     # Backend Express API
│   ├── server.js               # Main API server (~2,350 lines)
│   ├── database-pg.js          # PostgreSQL database class
│   ├── database.js             # Legacy JSON database (kept for reference)
│   ├── ecosystem.config.js     # PM2 production configuration
│   ├── .env.example            # Environment variable template
│   ├── database/
│   │   └── schema.sql          # PostgreSQL schema definition
│   └── public/
│       ├── modelo-produtos.xlsx       # Product import template
│       └── modelo-transacoes.xlsx     # Transaction import template
│
├── scripts/
│   ├── deploy.sh               # Full production deployment
│   ├── build-demo.sh           # GitHub Pages demo build
│   └── clear-demo-data.sh      # Demo data cleanup
│
├── docs/                       # GitHub Pages deployment output
├── public/                     # Static frontend assets (logos, icons)
├── index.html                  # Vite HTML entry point
├── vite.config.ts              # Vite build config (proxy, chunking, base path)
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig.json               # TypeScript compiler config
├── nginx-config.example        # Production Nginx template
└── README.md                   # Portuguese user documentation
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ (for full backend; not needed for demo mode)

### Running Locally

```bash
# Terminal 1 — Frontend (Vite dev server on port 8000)
npm install
npm run dev

# Terminal 2 — Backend (Nodemon on port 8001, auto-reloads)
cd server
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:8001/api` — no CORS issues during development.

### Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
JWT_SECRET=<generate-a-strong-random-secret>
PORT=8001

# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alya_db
DB_USER=alya_user
DB_PASSWORD=<your-password>

# Optional — email features are gracefully disabled if not set
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
```

For the frontend, `VITE_API_BASE_URL` can be set to override the API endpoint. When absent, `src/config/api.ts` auto-detects development vs. production.

---

## npm Scripts

### Frontend (`/`)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 8000, auto-opens browser) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run build:demo` | Build for GitHub Pages demo |
| `npm run clear:demo` | Clear demo environment data |
| `npm run lint` | ESLint with TypeScript rules |
| `npm run preview` | Preview production build locally |

### Backend (`/server`)

| Script | Description |
|---|---|
| `npm start` | Start server (production) |
| `npm run dev` | Start with Nodemon (development) |
| `npm run migrate` | Migrate data from JSON to PostgreSQL |
| `npm run migrate-projection` | Migrate projection data to PostgreSQL |
| `npm run validate-migration` | Validate migration success |

---

## Architecture & Key Conventions

### Frontend

**Component naming:** PascalCase for components (`Dashboard.tsx`), camelCase for hooks (`useModules.ts`) and utilities (`parseLocalDate`).

**State management:** React Context API only — no Redux. Three contexts:
- `AuthContext` — authentication state, JWT token, user profile, login/logout
- `ProductContext` — product catalog state
- `TransactionContext` — transaction list state

**RBAC (role-based access):** Defined in `src/hooks/usePermissions.ts`:
- `admin` — full CRUD, import, export, user management
- `user` — create, edit, view, import, export (no delete)
- `guest` — view and export only

**Lazy loading:** `AdminPanel` and `Projection` are lazily imported to reduce initial bundle size.

**Demo mode:** Detected by `github.io` hostname or `VITE_DEMO_MODE=true`. A Service Worker (`main.tsx`) intercepts API calls and returns mock data from localStorage so the app works offline on GitHub Pages.

**Date handling:** Always use `parseLocalDate` from `src/utils/dateUtils.ts` for parsing dates from strings — it avoids timezone offset issues that shift dates by one day.

**Styling:** Tailwind CSS utility classes exclusively. No CSS modules, no styled-components. Global overrides go in `index.css`.

### Backend

**Structure:** Single large `server.js` handles all routes. Routes are grouped by resource (auth, users, transactions, products, clients, admin, modules, activity-logs).

**Authentication:** JWT middleware validates Bearer tokens on all protected routes. Token payload contains `{ id, username, role }`.

**Database layer:** `database-pg.js` provides a class-based abstraction over `pg` (PostgreSQL). All queries use parameterized statements — no string interpolation in SQL.

**File uploads:** Multer stores files on disk under `server/uploads/`. Path traversal attacks are explicitly mitigated in file-serving routes.

**Email:** SendGrid integration is conditional — server checks for `SENDGRID_API_KEY` at startup and gracefully disables email features if missing.

**Error responses:** Follow the pattern `{ error: 'Portuguese error message' }` with appropriate HTTP status codes.

### Database Schema

Key tables in PostgreSQL:

| Table | Purpose |
|---|---|
| `users` | Accounts, profiles, roles, module permissions |
| `transactions` | Financial records (Receita / Despesa) |
| `products` | Inventory with price, cost, stock, sold count |
| `clients` | Customer records with Brazilian address fields |
| `modules` | System feature modules with routes and icons |
| `activity_logs` | Full audit trail of user actions |

All tables have `created_at` / `updated_at` timestamps. `updated_at` is auto-maintained by a PostgreSQL trigger.

---

## Production Deployment

### Architecture
```
Internet → Nginx (80/443)
                ↓
        /api/* → Express (localhost:8001) → PostgreSQL
        /*      → React build (/www/alya/dist)
```

### Deploy
```bash
./scripts/deploy.sh
```
This installs dependencies, builds the frontend, and prepares the backend. Then PM2 manages the server process:

```bash
cd server && pm2 start ecosystem.config.js
```

### PM2 Configuration (`server/ecosystem.config.js`)
- App name: `alya-server`
- Port: `8001`
- Auto-restart on crash
- Memory limit: `500MB`
- Logs: `/logs/pm2-*.log`

Nginx configuration template: `nginx-config.example`
- Gzip compression enabled
- React Router fallback (`try_files $uri /index.html`)
- `10MB` client body limit for file uploads
- Proxy timeouts: `60s`
- SSL-ready (Certbot)

---

## Testing

**Current state:** No test suite exists yet. TypeScript `tsconfig.json` excludes `*.test.ts` / `*.test.tsx` patterns (placeholder exclusions for future tests).

When adding tests:
- Frontend: use **Vitest** (already compatible with Vite's toolchain)
- Backend: use **Jest** or **Supertest** for API endpoint testing
- Run via `npm test` in the respective directory

---

## Key Files to Know

| File | Why It Matters |
|---|---|
| `src/App.tsx` | ~6,700 lines — central routing, shared state, dashboard logic. Read carefully before modifying. |
| `server/server.js` | ~2,350 lines — all API routes. Grep for the route you need before adding new ones. |
| `server/database/schema.sql` | Authoritative DB schema. Always update this when adding tables/columns. |
| `src/contexts/AuthContext.tsx` | Login flow, JWT storage, user profile. Touch with care. |
| `src/hooks/usePermissions.ts` | RBAC definitions. Modify here to change role capabilities. |
| `src/utils/dateUtils.ts` | Always use `parseLocalDate` — never `new Date(dateString)` directly. |
| `src/config/api.ts` | API base URL resolution. |
| `server/.env.example` | Template for all required environment variables. |

---

## Common Pitfalls

1. **Date parsing:** Do not use `new Date('YYYY-MM-DD')` directly in the frontend — it parses as UTC and shifts the date by one day in UTC-3. Use `parseLocalDate` from `dateUtils.ts`.

2. **SQL queries:** Always use parameterized queries (`$1`, `$2`, ...) in `database-pg.js`. Never interpolate user input into SQL strings.

3. **File serving:** When serving user-uploaded files, validate that the resolved path stays within the uploads directory. The existing code in `server.js` has path traversal protection — preserve it.

4. **Module permissions:** Adding a new system module requires inserting a row into the `modules` table AND updating `usePermissions.ts` for role-based visibility.

5. **Demo mode:** Changes to API response shapes must be reflected in the Service Worker mock data (`main.tsx`) for the GitHub Pages demo to stay functional.

6. **Large components:** `App.tsx` and `server.js` are large. Search for existing patterns before adding new ones — duplicate logic is a common risk.

7. **SendGrid:** Email features silently degrade if `SENDGRID_API_KEY` is not set. This is intentional. Do not throw errors for missing email config.

---

## Security Checklist

- JWT tokens must be validated on every protected route via the auth middleware
- Passwords are hashed with bcryptjs — never store or log plaintext passwords
- File uploads are restricted by MIME type and size via Multer configuration
- SQL uses parameterized queries via `pg` — no raw string interpolation
- CORS is configured to specific allowed origins only
- Rate limiting is applied on API endpoints
- Path traversal is mitigated in all file-serving routes

---

## Localization Notes

- The app targets Brazilian users exclusively
- All UI text, error messages, and comments are in **Brazilian Portuguese**
- Date format: `DD/MM/YYYY`
- Currency: BRL (R$), formatted with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Brazilian-specific utilities: CPF masking (`cpfMask.ts`), phone formatting (`phoneMask.ts`), postal code / CEP (`cepMask.ts`), address lookup via BrasilAPI/ViaCEP
