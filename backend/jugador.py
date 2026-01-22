from pydantic import BaseModel

class Jugador(BaseModel):
    id: int
    nombre: str
    nivel: int