# ProspectoAI v2

Herramienta de prospecting geoespacial para PyMEs. Busca negocios en Google Maps dentro de un territorio definido, muestra resultados en tiempo real sobre el mapa y exporta a Excel/CSV.

**Producto de [GerenciAndo Canales](https://gerenciandocanales.com)** — consultora de IA para PyMEs.

---

## Qué hace

1. **Definir territorio**: Buscá una localidad por nombre (geocoding + polígono real de OpenStreetMap) o dibujá un área libre en el mapa
2. **Configurar búsqueda**: Elegí palabras clave (ej: "restaurante", "ferretería"), ajustá el radio de búsqueda (200–2000m)
3. **Ejecutar**: El sistema divide el territorio en celdas hexagonales (H3) y consulta Google Places API por cada celda × keyword
4. **Ver resultados en tiempo real**: Los negocios aparecen en el mapa via SSE conforme se van encontrando
5. **Exportar**: Descargá los resultados en Excel o CSV con todos los datos (nombre, teléfono, dirección, web, calificación, etc.)
6. **Scraping de emails**: Opcionalmente, rastrea los sitios web encontrados para extraer emails de contacto

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| **Backend** | Python 3.12+ / FastAPI / asyncpg |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Base de datos** | PostgreSQL (Neon serverless) |
| **Autenticación** | Neon Auth (Better Auth) — OAuth + sesiones por cookie |
| **Grid espacial** | H3 (Uber) — indexación hexagonal |
| **Google APIs** | Places API (New) + Geocoding API — server-side REST |
| **Geocoding alternativo** | Nominatim (OpenStreetMap) para polígonos de localidades |
| **Mapa** | Google Maps JavaScript API via `@vis.gl/react-google-maps` |
| **State management** | Zustand (client) |
| **Deploy** | Railway (target) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + Vite + Tailwind CSS                                │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Territory │  │ Keywords │  │  Search  │  │   Export   │  │
│  │  Input   │  │  + Profiles│ │  + SSE   │  │  + Scrape  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │             │               │         │
│  ┌────┴──────────────┴─────────────┴───────────────┴──────┐  │
│  │              Zustand Stores + Axios Client              │  │
│  └─────────────────────────┬──────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP + SSE
┌────────────────────────────┼─────────────────────────────────┐
│                        BACKEND                               │
│  FastAPI + asyncpg                                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Auth     │  │ Territory│  │  Search  │  │  Export    │  │
│  │ (Neon)   │  │  + Grid  │  │  Engine  │  │  + Scraper │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │             │               │         │
│  ┌────┴──────────────┴─────────────┴───────────────┴──────┐  │
│  │              asyncpg Pool + Repositories                │  │
│  └─────────────────────────┬──────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   PostgreSQL    │
                    │   (Neon DB)     │
                    │   + neon_auth   │
                    └─────────────────┘
```

---

## Setup local

### Prerrequisitos

- Python 3.12+
- Node.js 18+
- PostgreSQL (o cuenta Neon gratuita en https://neon.tech)
- Google Cloud project con Places API (New) + Geocoding API + Maps JavaScript API habilitadas

### 1. Clonar

```bash
git clone https://github.com/ebrusco/Geolocalizador.git
cd Geolocalizador
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -e .
pip install email-validator  # requerido por Pydantic EmailStr
cp .env.example .env
# Editar .env con tus claves (ver sección Variables de Entorno)
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con tu VITE_GOOGLE_MAPS_KEY
npm run dev
```

### 4. Base de datos

**Opción A — Neon (recomendado):**
1. Crear proyecto en https://neon.tech
2. Copiar el connection string a `DATABASE_URL` en `backend/.env`
3. El backend aplica migraciones automáticamente al iniciar

**Opción B — Docker local:**
```bash
docker-compose up -d db
```

### 5. Autenticación (Neon Auth)

1. En el dashboard de Neon, habilitar "Neon Auth" en tu proyecto
2. Copiar la URL de auth a `NEON_AUTH_URL` en `backend/.env`
3. Configurar `ALLOWED_EMAILS` con los emails de administradores
4. Los usuarios se registran via el formulario de la app (email + contraseña)

Si dejás `NEON_AUTH_URL` vacío, la auth se desactiva y todas las rutas son públicas (modo desarrollo).

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Key server-side para Places API (New) + Geocoding | *requerido* |
| `DATABASE_URL` | Connection string PostgreSQL (Neon/Supabase/local) | *requerido* |
| `FRONTEND_URL` | Origen CORS del frontend | `http://localhost:5173` |
| `HOST` | Host del servidor | `0.0.0.0` |
| `PORT` | Puerto del servidor | `8000` |
| `NEON_AUTH_URL` | URL de Neon Auth — vacío para desactivar auth | *(vacío)* |
| `ALLOWED_EMAILS` | Emails admin separados por coma | *(vacío)* |
| `ENVIRONMENT` | `development` o `production` | `development` |
| `SEARCH_MAX_CONCURRENT` | Requests concurrentes a Google API | `5` |
| `SEARCH_DELAY_MS` | Delay entre requests (rate limiting) | `220` |
| `GRID_MAX_CELLS` | Máximo de celdas H3 por búsqueda | `5000` |

### Frontend (`frontend/.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_GOOGLE_MAPS_KEY` | Key para Maps JavaScript API (solo visualización de mapa) |

### Nota sobre API Keys de Google

Se necesitan **2 keys distintas**:
- **Backend key** (`GOOGLE_API_KEY`): Restringida a Places API (New) + Geocoding API. Server-side, nunca expuesta al cliente.
- **Frontend key** (`VITE_GOOGLE_MAPS_KEY`): Restringida a Maps JavaScript API. Restringir por HTTP referrer al dominio de la app.

---

## API endpoints

Todos los endpoints (excepto `/health`) requieren autenticación Bearer token cuando `NEON_AUTH_URL` está configurado.

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/me` | Datos del usuario autenticado |

### Territorios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/territories/geocode?q=...` | Geocodificar localidad (Google + Nominatim) |
| POST | `/api/v1/territories/grid` | Generar grilla H3 para bounds |
| POST | `/api/v1/territories/grid-polygon` | Generar grilla H3 para polígono GeoJSON |
| POST | `/api/v1/territories/polygon` | Obtener polígono de localidad (Nominatim) |

### Búsquedas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/searches/estimate` | Estimar costo antes de buscar |
| POST | `/api/v1/searches` | Iniciar búsqueda |
| GET | `/api/v1/searches` | Listar búsquedas |
| GET | `/api/v1/searches/{id}` | Detalle de búsqueda |
| GET | `/api/v1/searches/{id}/stream` | SSE stream de progreso (acepta `?token=`) |
| POST | `/api/v1/searches/{id}/cancel` | Cancelar búsqueda en curso |
| GET | `/api/v1/searches/{id}/results` | Resultados de búsqueda |

### Exportación
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/searches/{id}/export?format=xlsx` | Descargar Excel/CSV |
| POST | `/api/v1/searches/{id}/scrape-emails` | Scraping de emails (SSE stream) |

### Otros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/photos?ref=...` | Proxy de fotos (oculta API key) |
| GET | `/api/v1/usage` | Resumen de uso de API |
| GET | `/api/v1/usage/daily` | Uso diario |
| CRUD | `/api/v1/keyword-profiles` | Perfiles de palabras clave guardados |
| CRUD | `/api/v1/allowed-emails` | Gestión de whitelist (solo admin) |
| GET | `/health` | Health check |

---

## Base de datos

### Schema

5 tablas principales (ver `backend/app/db/migrations/001_initial.sql`):

- **`keyword_profiles`** — Perfiles guardados de palabras clave
- **`searches`** — Historial de búsquedas ejecutadas
- **`places`** — Store canónico de negocios (deduplicado por `google_place_id`)
- **`search_results`** — Junction table búsqueda ↔ lugar
- **`allowed_emails`** — Whitelist de emails con acceso

Además, Neon Auth crea automáticamente en el schema `neon_auth`:
- **`neon_auth.user`** — Usuarios registrados
- **`neon_auth.session`** — Sesiones activas

### Migraciones

Las migraciones se aplican automáticamente al iniciar el backend. El archivo está en:
```
backend/app/db/migrations/001_initial.sql
```

---

## Autenticación

### Flujo

1. Usuario se registra o loguea via formulario → POST a Neon Auth
2. Neon Auth devuelve `{ token, user }` + set-cookie
3. Frontend guarda token en localStorage y lo envía como `Authorization: Bearer <token>`
4. Backend verifica el token directamente contra la tabla `neon_auth.session` (query SQL, no HTTP a Neon)
5. Verificación de whitelist: el email del usuario debe estar en `ALLOWED_EMAILS` o en la tabla `allowed_emails`

### Control de acceso

- **Admins**: Emails en la variable `ALLOWED_EMAILS`. Pueden agregar/quitar usuarios desde el panel de la app.
- **Usuarios regulares**: Emails agregados por un admin. Pueden usar la app pero no gestionar accesos.
- **Sin whitelist**: Si `ALLOWED_EMAILS` está vacío y la tabla está vacía, cualquier usuario registrado puede acceder.

### Modo desarrollo

Si `NEON_AUTH_URL` está vacío, la auth se desactiva completamente. Todas las rutas devuelven un usuario "Dev" sin verificación.

---

## Deployment (Railway)

### Estructura recomendada

Crear 2 servicios en Railway:

**1. Backend (Python)**
```
Root Directory: backend
Build Command: pip install -e . && pip install email-validator
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Variables de entorno:
- `GOOGLE_API_KEY`, `DATABASE_URL`, `NEON_AUTH_URL`, `ALLOWED_EMAILS`
- `FRONTEND_URL` = URL del frontend en Railway
- `ENVIRONMENT` = `production`

**2. Frontend (Node.js)**
```
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npx serve dist -s -l $PORT
```

Variables de entorno:
- `VITE_GOOGLE_MAPS_KEY`

### Base de datos

Usar Neon (free tier) como base de datos. Railway no incluye PostgreSQL gratis.

---

## Auditoría de seguridad (Junio 2026)

Se realizó una auditoría completa del código. Se encontraron **65 hallazgos** (2 críticos, 14 altos, 28 medios, 21 bajos).

### Puntuación: 5.5/10 (pre-fix) → ~7.5/10 (post-fix)

### Hallazgos CRÍTICOS corregidos

| ID | Problema | Fix |
|----|----------|-----|
| SEC-01 | API key de Google expuesta en URLs de fotos enviadas al frontend | Nuevo endpoint proxy `/api/v1/photos` — key queda server-side |
| SEC-02 | Token en localStorage vulnerable a XSS + interceptor 401 desincronizado | Interceptor usa `clearAuth()` del store. Eliminada manipulación directa de localStorage |

### Hallazgos ALTOS corregidos

| ID | Problema | Fix |
|----|----------|-----|
| SEC-03 | Auth se desactivaba si la BD caía | En `production` devuelve 503, no bypass |
| SEC-04 | SSE stream sin autenticación (EventSource no envía headers) | Token por query param `?token=` + reconexión con backoff |
| SEC-05 | URLs de export sin auth (descarga via `<a href>`) | Migrado a `fetch` con Authorization header + blob download |
| SEC-06 | SSRF via email scraper (URLs de sitios web) | Validación de URLs contra IPs privadas/localhost/link-local |
| ERR-01 | Catches silenciosos en 5+ componentes | Toast de error visible al usuario |
| ERR-02 | `setFailed()` ignoraba el mensaje de error | Store guarda y muestra `errorMessage` |
| PERF-01 | N+1 queries en persistencia (loop de INSERTs individuales) | Batch con prepared statements + `executemany()` |
| PERF-02 | Markers se re-renderizan completo en cada nuevo resultado | `React.memo` en MarkerItem |
| PERF-03 | RadiusSlider dispara API call en cada pixel del drag | Debounce 300ms |
| STATE-01 | Race condition en AuthGate (respuesta async sobreescribe logout) | Flag `cancelled` en useEffect cleanup |
| UX-01 | Sin feedback cuando búsqueda falla | ProgressBar muestra `errorMessage` |
| UX-02 | Modales sin tecla Escape | Listener de keydown en ControlPanel y CostConfirmModal |

### Deuda técnica pendiente (MEDIO/BAJO)

Estos items no son bloqueantes pero se recomiendan para V3:

- [ ] `SearchOrchestrator` — 159 líneas de código muerto (eliminar)
- [ ] `DEFAULT_PROFILES` duplicados en 2 archivos (unificar)
- [ ] TanStack Query instalado pero no usado (migrar fetches o eliminar)
- [ ] 3 mecanismos HTTP distintos en frontend (unificar bajo axios)
- [ ] `AuthUser` type duplicado con diferencias entre archivos
- [ ] `api/deps.py` no se usa (eliminar)
- [ ] `@neondatabase/neon-js` instalado pero no importado (eliminar)
- [ ] UsageTracker crece en memoria sin límite (agregar purga)
- [ ] SearchRegistry no limpia búsquedas completadas (agregar TTL)
- [ ] SearchHistory polling cada 5s siempre (solo cuando hay búsqueda activa)
- [ ] Búsqueda secuencial — podría ser concurrente con semáforo
- [ ] httpx.AsyncClient se crea por cada geocodificación (reutilizar)
- [ ] `updated_at` sin trigger automático en BD
- [ ] Falta índice compuesto `(search_id, found_at)` en search_results
- [ ] Sin validación de tamaño en requests (keywords ilimitados, radius sin bounds)
- [ ] Botones de icono sin aria-label (accesibilidad)
- [ ] Logout sin confirmación (riesgo durante búsqueda activa)
- [ ] App.tsx monolítico — 230+ líneas (extraer componentes)
- [ ] Keywords en useState local en vez de store (prop drilling)
- [ ] Cero tests (priorizar auth flow, search engine, places client)

---

## Estructura del proyecto

```
Geolocalizador/
├── backend/
│   ├── app/
│   │   ├── api/                    # Routers FastAPI
│   │   │   ├── allowed_emails.py   # CRUD whitelist
│   │   │   ├── exports.py          # Export Excel/CSV + email scraping
│   │   │   ├── keyword_profiles.py # Perfiles de keywords
│   │   │   ├── photos.py           # Proxy de fotos (oculta API key)
│   │   │   ├── places.py           # Resultados de búsqueda
│   │   │   ├── searches.py         # CRUD búsquedas + SSE stream
│   │   │   ├── territories.py      # Geocoding + grilla H3
│   │   │   └── usage.py            # Dashboard de uso
│   │   ├── auth/
│   │   │   └── dependencies.py     # Auth middleware (Neon Auth)
│   │   ├── core/
│   │   │   ├── exceptions.py       # Excepciones custom
│   │   │   └── rate_limiter.py     # Rate limiter para Google API
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial.sql # Schema completo
│   │   │   └── repositories/       # Queries SQL (repository pattern)
│   │   ├── models/                 # Pydantic schemas
│   │   ├── services/               # Lógica de negocio
│   │   │   ├── email_scraper.py    # Scraping de emails
│   │   │   ├── export.py           # Generación Excel/CSV
│   │   │   ├── geocoding_client.py # Google Geocoding API
│   │   │   ├── grid.py             # Generación de celdas H3
│   │   │   ├── nominatim_client.py # OpenStreetMap Nominatim
│   │   │   ├── places_client.py    # Google Places API (New)
│   │   │   ├── progress_tracker.py # SSE event queue
│   │   │   ├── search_engine.py    # Orquestador de búsquedas
│   │   │   └── usage_tracker.py    # Tracking de uso/costos
│   │   ├── config.py               # Settings (pydantic-settings)
│   │   ├── database.py             # Pool asyncpg + migraciones
│   │   └── main.py                 # App FastAPI + lifespan
│   ├── .env.example
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/                    # Clientes HTTP (axios)
│   │   ├── components/
│   │   │   ├── auth/               # LoginPage
│   │   │   ├── control/            # ControlPanel (uso API + accesos)
│   │   │   ├── keywords/           # KeywordInput, ProfileSelector
│   │   │   ├── layout/             # Toast
│   │   │   ├── map/                # MapContainer, PlaceMarkers, DrawingToolbar
│   │   │   ├── search/             # SearchActions, ProgressBar, ExportButton, etc.
│   │   │   └── territory/          # TerritoryInput, RadiusSlider, etc.
│   │   ├── hooks/                  # useSearchSSE
│   │   ├── lib/                    # auth helpers
│   │   ├── stores/                 # Zustand (auth, search, territory, UI)
│   │   ├── types/                  # TypeScript types
│   │   └── App.tsx                 # Layout principal + AuthGate
│   ├── .env.example
│   └── package.json
├── CLAUDE.md                       # Instrucciones para Claude Code
├── .gitignore
└── README.md                       # Este archivo
```

---

## Cómo funciona la búsqueda

1. **Territorio** → Se define un área geográfica (bounds o polígono GeoJSON)
2. **Celdas H3** → El área se divide en hexágonos usando [H3](https://h3geo.org/) con resolución automática según el radio
3. **Búsqueda** → Para cada celda × keyword, se hace un `searchText` a Google Places API (New) con `locationRestriction`
4. **Deduplicación** → Los resultados se deduplicar por `google_place_id` (un negocio puede aparecer en varias celdas)
5. **Streaming** → Cada resultado nuevo se emite via SSE al frontend para mostrar en tiempo real
6. **Persistencia** → Al completar, los resultados se guardan en batch a PostgreSQL
7. **Export** → Se genera Excel/CSV con columnas en español y encoding UTF-8 BOM

### Costos de Google API

- Google da **$200 USD/mes gratis** (~28,571 llamadas a Places Text Search)
- Costo por llamada: ~$0.007 USD
- La app trackea el uso y muestra crédito restante en el panel de control
- El modal de confirmación pre-búsqueda muestra el costo estimado con semáforo verde/amarillo/rojo

---

## Licencia

Proyecto privado de GerenciAndo Canales. No redistribuir sin autorización.
