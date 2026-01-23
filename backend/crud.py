from sqlalchemy.orm import Session
import models, schemas

def get_tables(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Table).all()

def create_table(db: Session, table: schemas.TableCreate):
    db_table = models.Table(name=table.name, type=table.type)
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

def get_table(db: Session, table_id: int):
    return db.query(models.Table).filter(models.Table.id == table_id).first()
