from sqlalchemy import Column, Integer, String
from database import Base

class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String)  # 'POOL', 'CARDS'
    status = Column(String, default='AVAILABLE')  # 'AVAILABLE', 'OCCUPIED'
    current_session_id = Column(Integer, nullable=True)
