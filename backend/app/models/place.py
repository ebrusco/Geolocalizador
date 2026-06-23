from pydantic import BaseModel


class PlaceResponse(BaseModel):
    id: int
    google_place_id: str
    keyword: str
    nombre: str | None
    direccion_completa: str | None
    telefono: str | None
    sitio_web: str | None
    calificacion: float | None
    total_calificaciones: int | None
    estado_negocio: str | None
    nivel_precio: int | None
    tipos: list[str] | None
    latitud: float | None
    longitud: float | None
    pais: str | None
    provincia: str | None
    localidad: str | None
    barrio: str | None
    calle: str | None
    numero: str | None
    codigo_postal: str | None
    horarios: str | None
    descripcion: str | None
    foto_url: str | None
    enlace_maps: str | None


class PlaceListResponse(BaseModel):
    places: list[PlaceResponse]
    total: int
    page: int
    per_page: int
