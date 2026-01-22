from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
import os

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Imprimir la URL de conexión para depuración
print("DATABASE_URL:", os.getenv("DATABASE_URL"))

# Obtener la URL de conexión a la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")

# Verificar que la variable esté definida
if not DATABASE_URL:
    raise ValueError("La variable DATABASE_URL no está definida en el archivo .env")

# Crear el motor de conexión con SQLAlchemy
engine = create_engine(DATABASE_URL)

# Crear la aplicación FastAPI
app = FastAPI()

# Endpoint raíz para verificar la conexión a PostgreSQL
@app.get("/")
def verificar_conexion():
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            return {"estado": "Conexión exitosa", "resultado": [row[0] for row in result]}
    except SQLAlchemyError as e:
        return {"estado": "Error de conexión", "detalle": str(e)}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)