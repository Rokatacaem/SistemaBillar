from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import models, schemas, crud
from database import SessionLocal, engine

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Sistema Billar API Running"}

@app.post("/tables/", response_model=schemas.Table)
def create_table(table: schemas.TableCreate, db: Session = Depends(get_db)):
    return crud.create_table(db=db, table=table)

@app.get("/tables/", response_model=list[schemas.Table])
def read_tables(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tables = crud.get_tables(db, skip=skip, limit=limit)
    return tables

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)