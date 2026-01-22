from dotenv import load_dotenv
import os

# Cargar variables desde el archivo .env
load_dotenv()

# Exponer las variables como constantes
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

# Verificación opcional
if __name__ == "__main__":
    print("DATABASE_URL:", DATABASE_URL)
    print("SECRET_KEY:", SECRET_KEY)