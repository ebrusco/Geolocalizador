from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_api_key: str = ""
    database_url: str = ""
    frontend_url: str = "http://localhost:5173"
    host: str = "0.0.0.0"
    port: int = 8000

    google_places_base_url: str = "https://places.googleapis.com/v1"
    google_geocoding_base_url: str = "https://maps.googleapis.com/maps/api/geocode"

    search_max_concurrent: int = 5
    search_delay_ms: int = 220
    grid_max_cells: int = 5000

    neon_auth_url: str = ""
    allowed_emails: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
