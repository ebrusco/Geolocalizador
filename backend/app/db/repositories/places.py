from decimal import Decimal

import asyncpg


async def upsert(pool: asyncpg.Pool, place: dict) -> int:
    row = await pool.fetchrow(
        """INSERT INTO places (
               google_place_id, nombre, direccion_completa, telefono,
               telefono_internacional, sitio_web, calificacion,
               total_calificaciones, estado_negocio, nivel_precio,
               tipos, latitud, longitud, pais, provincia, localidad,
               barrio, calle, numero, codigo_postal, horarios,
               descripcion, foto_url, enlace_maps
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
           ON CONFLICT (google_place_id) DO UPDATE SET
               nombre = EXCLUDED.nombre,
               direccion_completa = EXCLUDED.direccion_completa,
               telefono = EXCLUDED.telefono,
               telefono_internacional = EXCLUDED.telefono_internacional,
               sitio_web = EXCLUDED.sitio_web,
               calificacion = EXCLUDED.calificacion,
               total_calificaciones = EXCLUDED.total_calificaciones,
               estado_negocio = EXCLUDED.estado_negocio,
               nivel_precio = EXCLUDED.nivel_precio,
               tipos = EXCLUDED.tipos,
               latitud = EXCLUDED.latitud,
               longitud = EXCLUDED.longitud,
               pais = EXCLUDED.pais,
               provincia = EXCLUDED.provincia,
               localidad = EXCLUDED.localidad,
               barrio = EXCLUDED.barrio,
               calle = EXCLUDED.calle,
               numero = EXCLUDED.numero,
               codigo_postal = EXCLUDED.codigo_postal,
               horarios = EXCLUDED.horarios,
               descripcion = EXCLUDED.descripcion,
               foto_url = EXCLUDED.foto_url,
               enlace_maps = EXCLUDED.enlace_maps,
               updated_at = NOW()
           RETURNING id""",
        place.get("google_place_id"),
        place.get("nombre"),
        place.get("direccion_completa"),
        place.get("telefono"),
        place.get("telefono_internacional"),
        place.get("sitio_web"),
        place.get("calificacion"),
        place.get("total_calificaciones"),
        place.get("estado_negocio"),
        place.get("nivel_precio"),
        place.get("tipos"),
        place.get("latitud"),
        place.get("longitud"),
        place.get("pais"),
        place.get("provincia"),
        place.get("localidad"),
        place.get("barrio"),
        place.get("calle"),
        place.get("numero"),
        place.get("codigo_postal"),
        place.get("horarios"),
        place.get("descripcion"),
        place.get("foto_url"),
        place.get("enlace_maps"),
    )
    return row["id"]


async def upsert_batch(pool: asyncpg.Pool, places: list[dict]) -> list[int]:
    if not places:
        return []
    ids = []
    _UPSERT_SQL = """INSERT INTO places (
           google_place_id, nombre, direccion_completa, telefono,
           telefono_internacional, sitio_web, calificacion,
           total_calificaciones, estado_negocio, nivel_precio,
           tipos, latitud, longitud, pais, provincia, localidad,
           barrio, calle, numero, codigo_postal, horarios,
           descripcion, foto_url, enlace_maps
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (google_place_id) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           direccion_completa = EXCLUDED.direccion_completa,
           telefono = EXCLUDED.telefono,
           telefono_internacional = EXCLUDED.telefono_internacional,
           sitio_web = EXCLUDED.sitio_web,
           calificacion = EXCLUDED.calificacion,
           total_calificaciones = EXCLUDED.total_calificaciones,
           estado_negocio = EXCLUDED.estado_negocio,
           nivel_precio = EXCLUDED.nivel_precio,
           tipos = EXCLUDED.tipos,
           latitud = EXCLUDED.latitud,
           longitud = EXCLUDED.longitud,
           pais = EXCLUDED.pais,
           provincia = EXCLUDED.provincia,
           localidad = EXCLUDED.localidad,
           barrio = EXCLUDED.barrio,
           calle = EXCLUDED.calle,
           numero = EXCLUDED.numero,
           codigo_postal = EXCLUDED.codigo_postal,
           horarios = EXCLUDED.horarios,
           descripcion = EXCLUDED.descripcion,
           foto_url = EXCLUDED.foto_url,
           enlace_maps = EXCLUDED.enlace_maps,
           updated_at = NOW()
       RETURNING id"""
    async with pool.acquire() as conn:
        stmt = await conn.prepare(_UPSERT_SQL)
        async with conn.transaction():
            for place in places:
                row = await stmt.fetchrow(
                    place.get("google_place_id"),
                    place.get("nombre"),
                    place.get("direccion_completa"),
                    place.get("telefono"),
                    place.get("telefono_internacional"),
                    place.get("sitio_web"),
                    place.get("calificacion"),
                    place.get("total_calificaciones"),
                    place.get("estado_negocio"),
                    place.get("nivel_precio"),
                    place.get("tipos"),
                    place.get("latitud"),
                    place.get("longitud"),
                    place.get("pais"),
                    place.get("provincia"),
                    place.get("localidad"),
                    place.get("barrio"),
                    place.get("calle"),
                    place.get("numero"),
                    place.get("codigo_postal"),
                    place.get("horarios"),
                    place.get("descripcion"),
                    place.get("foto_url"),
                    place.get("enlace_maps"),
                )
                ids.append(row["id"])
    return ids


async def add_search_result(pool: asyncpg.Pool, search_id: int, place_id: int,
                            keyword: str, h3_cell: str | None = None):
    await pool.execute(
        """INSERT INTO search_results (search_id, place_id, keyword, h3_cell)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (search_id, place_id, keyword) DO NOTHING""",
        search_id, place_id, keyword, h3_cell,
    )


async def add_search_results_batch(pool: asyncpg.Pool, search_id: int,
                                   results: list[tuple[int, str]]):
    if not results:
        return
    async with pool.acquire() as conn:
        await conn.executemany(
            """INSERT INTO search_results (search_id, place_id, keyword)
               VALUES ($1, $2, $3)
               ON CONFLICT (search_id, place_id, keyword) DO NOTHING""",
            [(search_id, place_id, keyword) for place_id, keyword in results],
        )


def _convert_value(v):
    if isinstance(v, Decimal):
        return float(v)
    return v


async def get_places_for_search(pool: asyncpg.Pool, search_id: int) -> list[dict]:
    rows = await pool.fetch(
        """SELECT p.google_place_id, p.nombre, p.direccion_completa, p.telefono,
                  p.telefono_internacional, p.sitio_web, p.calificacion,
                  p.total_calificaciones, p.estado_negocio, p.nivel_precio,
                  p.tipos, p.latitud, p.longitud, p.pais, p.provincia,
                  p.localidad, p.barrio, p.calle, p.numero, p.codigo_postal,
                  p.horarios, p.descripcion, p.foto_url, p.enlace_maps,
                  sr.keyword
           FROM places p
           JOIN search_results sr ON sr.place_id = p.id
           WHERE sr.search_id = $1
           ORDER BY sr.found_at""",
        search_id,
    )
    return [{k: _convert_value(v) for k, v in dict(r).items()} for r in rows]
