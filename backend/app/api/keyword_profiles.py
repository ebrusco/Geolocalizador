from fastapi import APIRouter, HTTPException

import app.database as db
from app.db.repositories import keyword_profiles as kp_repo
from app.models.keyword_profile import KeywordProfileCreate, KeywordProfileResponse

router = APIRouter()

# In-memory fallback when no database is connected
_profiles: dict[int, dict] = {}
_counter = 0

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


def _init_defaults():
    global _counter
    if not _profiles:
        for p in DEFAULT_PROFILES:
            _counter += 1
            _profiles[_counter] = {"id": _counter, **p}


@router.get("", response_model=list[KeywordProfileResponse])
async def list_profiles():
    if db.is_connected():
        return await kp_repo.list_all(db.pool)
    _init_defaults()
    return list(_profiles.values())


@router.post("", response_model=KeywordProfileResponse, status_code=201)
async def create_profile(req: KeywordProfileCreate):
    if db.is_connected():
        return await kp_repo.create(db.pool, req.nombre, req.keywords)
    _init_defaults()
    global _counter
    _counter += 1
    profile = {"id": _counter, "nombre": req.nombre, "keywords": req.keywords}
    _profiles[_counter] = profile
    return profile


@router.put("/{profile_id}", response_model=KeywordProfileResponse)
async def update_profile(profile_id: int, req: KeywordProfileCreate):
    if db.is_connected():
        result = await kp_repo.update(db.pool, profile_id, req.nombre, req.keywords)
        if not result:
            raise HTTPException(404, "Profile not found")
        return result
    if profile_id not in _profiles:
        raise HTTPException(404, "Profile not found")
    _profiles[profile_id]["nombre"] = req.nombre
    _profiles[profile_id]["keywords"] = req.keywords
    return _profiles[profile_id]


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: int):
    if db.is_connected():
        deleted = await kp_repo.delete(db.pool, profile_id)
        if not deleted:
            raise HTTPException(404, "Profile not found")
        return
    if profile_id not in _profiles:
        raise HTTPException(404, "Profile not found")
    del _profiles[profile_id]
