# ProspectoAI v2

Geospatial business prospecting tool. Searches Google Maps for businesses within a territory and exports results to CSV.

## Architecture

- **Backend**: Python 3.12+ / FastAPI in `backend/`
- **Frontend**: React + Vite + TypeScript + Tailwind CSS in `frontend/`
- **Database**: PostgreSQL + PostGIS (Supabase or local Docker)
- **Grid**: H3 (Uber) hexagonal spatial indexing
- **Google API**: Places API (New) — server-side REST, NOT client-side JS SDK

## Running locally

### Backend
```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database (Docker)
```bash
docker-compose up -d db
```

### Database (Supabase)
Run `backend/app/db/migrations/001_initial.sql` in the Supabase SQL editor.

## Environment variables

### Backend (`backend/.env`)
- `GOOGLE_API_KEY` — server-side key for Places API (New) + Geocoding
- `DATABASE_URL` — PostgreSQL connection string
- `FRONTEND_URL` — CORS origin (default: http://localhost:5173)
- `NEON_AUTH_URL` — Neon Auth URL (empty = auth disabled)
- `ALLOWED_EMAILS` — admin emails, comma-separated
- `ENVIRONMENT` — `development` or `production` (controls auth-fail behavior)

### Frontend (`frontend/.env`)
- `VITE_GOOGLE_MAPS_KEY` — Maps JavaScript API key (frontend display only)

## Conventions

- Backend modules use async/await throughout
- Pydantic models for all API request/response schemas
- Repository pattern for database queries (raw SQL via asyncpg)
- Zustand for client state, TanStack Query for server state cache
- SSE for real-time search progress updates
- CSV export: semicolon separator, UTF-8 BOM, Spanish column names
