import os
import requests
import subprocess
from dotenv import load_dotenv
import psycopg2
from psycopg2 import OperationalError

load_dotenv()

def verificar_docker():
    try:
        resultado = subprocess.run(["docker", "ps"], capture_output=True, text=True)
        if resultado.returncode == 0 and "CONTAINER" in resultado.stdout:
            return "✅ Docker está corriendo y hay contenedores activos."
        else:
            return "⚠️ Docker está instalado pero no hay contenedores activos."
    except FileNotFoundError:
        return "❌ Docker no está instalado o no está en el PATH."

def verificar_backend():
    try:
        r = requests.get("http://127.0.0.1:8000")
        if r.status_code == 200:
            return "✅ Backend (FastAPI) está activo."
        else:
            return f"⚠️ Backend respondió con código {r.status_code}."
    except requests.exceptions.ConnectionError:
        return "❌ Backend no está corriendo en http://127.0.0.1:8000."

def verificar_frontend():
    try:
        r = requests.get("http://localhost:3000")
        if r.status_code == 200:
            return "✅ Frontend (React) está activo."
        else:
            return f"⚠️ Frontend respondió con código {r.status_code}."
    except requests.exceptions.ConnectionError:
        return "❌ Frontend no está corriendo en http://localhost:3000."

def verificar_postgresql():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return "❌ DATABASE_URL no está definida en el archivo .env."

    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        return "✅ Conexión a PostgreSQL exitosa."
    except OperationalError as e:
        return f"❌ Error al conectar con PostgreSQL: {e}"

if __name__ == "__main__":
    print("🔍 Verificando servicios del entorno de desarrollo...\n")
    print(verificar_docker())
    print(verificar_backend())
    print(verificar_frontend())
    print(verificar_postgresql())