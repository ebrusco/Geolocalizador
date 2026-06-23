from pydantic import BaseModel


class KeywordProfileCreate(BaseModel):
    nombre: str
    keywords: list[str]


class KeywordProfileResponse(BaseModel):
    id: int
    nombre: str
    keywords: list[str]
