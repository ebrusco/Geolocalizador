import asyncpg


DEFAULT_PROFILES = [
    {"nombre": "Gastronomía", "keywords": ["restaurante", "bar", "cafetería", "pizzería", "heladería"]},
    {"nombre": "Salud", "keywords": ["farmacia", "clínica", "dentista", "óptica", "veterinaria"]},
    {"nombre": "Servicios", "keywords": ["cerrajería", "electricista", "plomero", "taller mecánico", "lavadero"]},
    {"nombre": "Comercio", "keywords": ["supermercado", "ferretería", "librería", "verdulería", "carnicería"]},
    {"nombre": "Belleza", "keywords": ["peluquería", "salón de belleza", "spa"]},
    {"nombre": "Fitness", "keywords": ["gimnasio", "crossfit", "pilates"]},
    {"nombre": "Educación", "keywords": ["escuela", "instituto", "academia"]},
    {"nombre": "Automotor", "keywords": ["taller mecánico", "gomería", "concesionaria"]},
    {"nombre": "Hogar", "keywords": ["mueblería", "pinturería", "vidriera"]},
    {"nombre": "Profesionales", "keywords": ["abogado", "contador", "estudio contable"]},
    {"nombre": "Tecnología", "keywords": ["electrónica", "celulares", "computación"]},
    {"nombre": "Inmobiliaria", "keywords": ["inmobiliaria", "alquiler", "departamentos"]},
    {"nombre": "Mascotas", "keywords": ["veterinaria", "pet shop", "peluquería canina"]},
    {"nombre": "Indumentaria", "keywords": ["ropa", "zapatería", "tienda de ropa"]},
    {"nombre": "Cotillón", "keywords": ["cotillón", "artículos de fiesta", "globos"]},
]


async def seed_defaults(pool: asyncpg.Pool):
    count = await pool.fetchval("SELECT COUNT(*) FROM keyword_profiles")
    if count == 0:
        async with pool.acquire() as conn:
            for p in DEFAULT_PROFILES:
                await conn.execute(
                    "INSERT INTO keyword_profiles (nombre, keywords) VALUES ($1, $2)",
                    p["nombre"], p["keywords"],
                )


async def list_all(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch("SELECT id, nombre, keywords FROM keyword_profiles ORDER BY id")
    return [dict(r) for r in rows]


async def create(pool: asyncpg.Pool, nombre: str, keywords: list[str]) -> dict:
    row = await pool.fetchrow(
        "INSERT INTO keyword_profiles (nombre, keywords) VALUES ($1, $2) RETURNING id, nombre, keywords",
        nombre, keywords,
    )
    return dict(row)


async def update(pool: asyncpg.Pool, profile_id: int, nombre: str, keywords: list[str]) -> dict | None:
    row = await pool.fetchrow(
        "UPDATE keyword_profiles SET nombre = $2, keywords = $3 WHERE id = $1 RETURNING id, nombre, keywords",
        profile_id, nombre, keywords,
    )
    return dict(row) if row else None


async def delete(pool: asyncpg.Pool, profile_id: int) -> bool:
    result = await pool.execute("DELETE FROM keyword_profiles WHERE id = $1", profile_id)
    return result == "DELETE 1"
