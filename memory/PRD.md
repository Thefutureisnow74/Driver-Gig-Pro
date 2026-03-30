# Driver Gig CRM (DriverGigsPro) - Product Requirements Document

## Original Problem Statement
Build a full-stack SaaS desktop web application called "DriverGigsPro CRM" for independent gig delivery drivers to manage their gig platform portfolio. Pure React with inline styles only — no Tailwind, no UI libraries, no shadcn.

## Tech Stack
- **Frontend**: React, pure inline styles (no CSS frameworks)
- **Backend**: FastAPI, MongoDB (Motor async driver)
- **AI**: Emergent LLM (GPT) for company auto-fill, follow-up analysis, job hunting, and outreach drafting
- **State**: React useState at App level, props drilling

## What's Currently Working (as of Feb 2026)
- **Dashboard**: 4 color-coded KPIs, Overdue alert section, All Opportunities table
- **Companies page**: Table with filters, video upload popup, SearchableDropdown multi-select with "Select All", AI Recommendation section
- **AI Auto-fill**: Type company name -> click "AI Auto-fill" -> AI populates all fields
- **Recommendation engine**: Top of Companies page — 3 cards based on user profile
- **Company Profile Card**: Reorganized layout — header + status dropdown, chips, details, contacts
- **Communications**: Unified Activity Log + Email — company click filters + opens Log Activity
- **AI Job Hunter**: 3-step wizard:
  - Step 1 (Setup): Service types, vehicles, states, search sources, **keyword auto-suggest with 70+ curated keywords organized by 10 categories**
  - Step 2 (Results): AI-curated jobs with match scores, source badges, Add to CRM/Draft Outreach/Apply buttons
  - Step 3 (Outreach): AI-drafted emails with editable subject/body, Log to Communications/Add to CRM & Log/Copy/Regenerate
  - Auto-Pilot mode, Session Tracker mini-dashboard
- **User Profile (Settings)**: Profile Overview, 5 tabs, Goals & Objectives Questionnaire
- 26 service types, 9 statuses

## Key API Endpoints
- POST /api/ai/company-autofill — AI fills company fields from name
- POST /api/ai/followup-analysis — AI analyzes communication log
- POST /api/ai/generate-keywords — AI generates optimized job search keywords
- POST /api/ai/search-jobs — AI searches for gig opportunities (accepts keywords param)
- POST /api/ai/draft-outreach — AI drafts outreach email for a job
- POST /api/ai/auto-pilot — AI does full search + outreach drafting
- POST /api/email/send — SendGrid email sending
- POST /api/companies/{id}/files — File upload
- POST /api/job-hunter/save — Save a job result
- GET /api/job-hunter/saved — Get saved jobs

## Backlog
### P0 - Connect to Backend
- Wire frontend to backend API endpoints (replace mock data)
- Add authentication flow (login page)

### P1
- CSV import/export for companies
- Persist profile/questionnaire data to backend
- SendGrid integration for actual email sending from Job Hunter outreach

### P2
- Settings section for SendGrid API Key (multi-tenant)
- Mobile responsiveness
- Saved job history and tracking in Job Hunter
