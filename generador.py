import os

# Crear las carpetas necesarias si no existen
os.makedirs("backend", exist_ok=True)
os.makedirs("frontend", exist_ok=True)

# Contenido del Dockerfile para el backend (FastAPI)
dockerfile_backend = '''FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
'''

# Contenido del Dockerfile para el frontend (React)
dockerfile_frontend = '''FROM node:18

WORKDIR /app

COPY sistema-billar/package*.json ./
RUN npm install

COPY sistema-billar/ .

EXPOSE 3000
CMD ["npm", "start"]
'''

# Contenido del requirements.txt para el backend
requirements_backend = '''fastapi
uvicorn
sqlalchemy
psycopg2-binary
python-dotenv
requests
'''

# Guardar los archivos en sus respectivas ubicaciones
with open("backend/Dockerfile", "w") as f:
    f.write(dockerfile_backend)

with open("frontend/Dockerfile", "w") as f:
    f.write(dockerfile_frontend)

with open("backend/requirements.txt", "w") as f:
    f.write(requirements_backend)

print("Archivos Dockerfile y requirements.txt creados correctamente.")