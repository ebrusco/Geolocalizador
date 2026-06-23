-- ProspectoAI v2 — Schema (idempotent, no PostGIS required)

-- Keyword profiles: saved keyword sets
CREATE TABLE IF NOT EXISTS keyword_profiles (
    id       SERIAL PRIMARY KEY,
    nombre   TEXT NOT NULL,
    keywords TEXT[] NOT NULL
);

-- Searches: one row per search job
CREATE TABLE IF NOT EXISTS searches (
    id                SERIAL PRIMARY KEY,
    territorio_nombre TEXT NOT NULL,
    keywords          TEXT[] NOT NULL,
    radius_m          INT NOT NULL,
    bounds            JSONB,
    geojson           JSONB,
    field_mask        TEXT NOT NULL DEFAULT 'basic,contact',
    status            TEXT NOT NULL DEFAULT 'pending',
    total_cells       INT NOT NULL DEFAULT 0,
    completed_cells   INT NOT NULL DEFAULT 0,
    total_places      INT NOT NULL DEFAULT 0,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_searches_status ON searches (status);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches (created_at DESC);

-- Places: canonical, deduplicated store of businesses
CREATE TABLE IF NOT EXISTS places (
    id                     SERIAL PRIMARY KEY,
    google_place_id        TEXT UNIQUE NOT NULL,
    nombre                 TEXT,
    direccion_completa     TEXT,
    telefono               TEXT,
    telefono_internacional TEXT,
    sitio_web              TEXT,
    calificacion           NUMERIC(3, 1),
    total_calificaciones   INT,
    estado_negocio         TEXT,
    nivel_precio           INT,
    tipos                  TEXT[],
    latitud                DOUBLE PRECISION,
    longitud               DOUBLE PRECISION,
    pais                   TEXT,
    provincia              TEXT,
    localidad              TEXT,
    barrio                 TEXT,
    calle                  TEXT,
    numero                 TEXT,
    codigo_postal          TEXT,
    horarios               TEXT,
    descripcion            TEXT,
    foto_url               TEXT,
    enlace_maps            TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_google_id ON places (google_place_id);

-- Search results: junction table linking searches to places
CREATE TABLE IF NOT EXISTS search_results (
    id        SERIAL PRIMARY KEY,
    search_id INT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    place_id  INT NOT NULL REFERENCES places(id),
    keyword   TEXT NOT NULL,
    h3_cell   TEXT,
    found_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (search_id, place_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_search_results_search ON search_results (search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_place ON search_results (place_id);

-- Allowed emails: whitelist of users who can access the app
CREATE TABLE IF NOT EXISTS allowed_emails (
    id         SERIAL PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    added_by   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
