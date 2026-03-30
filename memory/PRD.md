# Driver Gig CRM - Product Requirements Document

## Overview
A full-stack SaaS desktop web application for gig delivery drivers to manage their delivery platforms, contacts, follow-ups, and job search in one professional CRM.

## Tech Stack
- **Frontend**: Pure React with inline styles (NO Tailwind, NO Shadcn). Styling via `theme.js`.
- **Backend**: FastAPI (Python)
- **Database**: Supabase PostgreSQL (via SQLAlchemy + asyncpg)
- **AI**: Emergent LLM Key (OpenAI) for auto-fill, recommendations, job search, outreach drafting
- **Email**: SendGrid (requires user API key)
- **Auth**: JWT-based custom auth (bcrypt + PyJWT)

## Database Schema (Supabase PostgreSQL)
8 tables: `users`, `companies`, `activities`, `earnings`, `settings`, `documents`, `saved_jobs`, `user_sessions`

## Core Features

### Implemented ✅
1. **Authentication** - Login/Register with JWT tokens, session persistence
2. **Companies CRM** - Full CRUD with table view, filters (status, state, work model, vehicles, service type), search, sorting
3. **Company Profile Card** - Editable inline drawer with all company fields, contacts, YouTube video theater-mode popup
4. **AI Company Auto-fill** - LLM-powered company data population
5. **Activity/Communication Log** - Create and view activities per company and globally
6. **Dashboard** - KPI cards (total companies, follow-ups due, offers+active, scheduled today), overdue alerts, recent activities
7. **Job Hunter** - 3-step AI tool (Setup→Results→Outreach) with dynamic keyword generation, job search, outreach drafting, add-to-CRM
8. **Settings** - Handler management (add/rename/delete), driver profile editing, data seeding
9. **Top 3 Recommendations** - AI-scored company suggestions based on user profile
10. **Service Type Breakdown** - Clickable header showing count per service type
11. **File Upload** - Per-company file/photo/video uploads
12. **Seed Data** - 10 sample gig companies with activities and earnings
13. **Backend Migration** - MongoDB → Supabase PostgreSQL (COMPLETED 2026-03-30)
14. **Frontend API Wiring** - All CRUD operations persist to Supabase via API (COMPLETED 2026-03-30)

### In Progress 🔄
None currently

### Upcoming (P1) 📋
- **User API Key Input** - Settings field for user's own API key (OpenAI/SendGrid) for AI features
- **Supabase Auth Migration** - Replace current JWT auth with Supabase Auth (user requested)
- **Persist Driver Profile** - Save Goals & Objectives questionnaire to backend

### Future/Backlog (P2) 📦
- SendGrid API Key management in Settings
- CSV import/export functionality
- Mobile responsiveness (currently Desktop-only)
- Saved job history/tracking in Job Hunter

## Architecture
```
/app/
├── backend/
│   ├── server.py          # FastAPI endpoints (SQLAlchemy + Supabase PostgreSQL)
│   ├── database.py        # Async SQLAlchemy engine config
│   ├── models.py          # SQLAlchemy ORM models (8 tables)
│   ├── alembic/           # Database migrations
│   ├── requirements.txt
│   ├── uploads/           # File uploads storage
│   └── .env               # DATABASE_URL, SUPABASE_URL, keys, JWT_SECRET
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Auth flow, routing, global state
│   │   ├── api.js         # API utility (auth, CRUD, snake/camelCase mapping)
│   │   ├── theme.js       # Styling constants and data arrays
│   │   ├── mockData.js    # Legacy mock data (no longer primary source)
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   ├── Companies.jsx  # Company table with filters
│   │   ├── CompanyCard.jsx # Company detail drawer
│   │   ├── JobHunter.jsx  # AI job search tool
│   │   ├── pages.jsx      # Dashboard, Communications, Settings
│   │   ├── components.jsx # Reusable UI components
│   │   └── HandlerCombobox.jsx
│   └── .env               # REACT_APP_BACKEND_URL
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info
- `GET/POST/PUT/DELETE /api/companies` - Companies CRUD
- `GET/POST /api/activities` - Activities CRUD
- `GET/POST/DELETE /api/earnings` - Earnings CRUD
- `GET/PUT /api/settings/handlers` - Handler management
- `GET/PUT /api/settings/profile` - User profile
- `GET /api/dashboard` - Dashboard KPI data
- `POST /api/seed` - Seed sample data
- `POST /api/ai/*` - AI endpoints (autofill, recommendation, job search, outreach)
- `POST /api/email/send` - SendGrid email sending
- `POST/GET/DELETE /api/job-hunter/saved` - Saved jobs

## Testing
- Backend: 100% pass rate (13/13 tests)
- Frontend: 94% pass rate (16/17 features verified)
- Test reports: /app/test_reports/iteration_8.json
