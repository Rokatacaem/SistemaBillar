from pydantic import BaseModel
from typing import Optional

class TableBase(BaseModel):
    name: str
    type: str

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    current_session_id: Optional[int] = None

class Table(TableBase):
    id: int
    status: str
    current_session_id: Optional[int] = None

    class Config:
        orm_mode = True
