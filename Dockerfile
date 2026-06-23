# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ARG VITE_GOOGLE_MAPS_KEY=""
ARG VITE_NEON_AUTH_URL=""
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY
ENV VITE_NEON_AUTH_URL=$VITE_NEON_AUTH_URL
RUN npm run build

# Stage 2: Python backend + frontend dist
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps (cached layer — dummy package so pip resolves pyproject.toml)
COPY backend/pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py \
    && pip install --no-cache-dir . \
    && pip install --no-cache-dir email-validator \
    && rm -rf app

# Copy backend code
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./static

ENV HOST=0.0.0.0
ENV PORT=8000
ENV ENVIRONMENT=production

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
