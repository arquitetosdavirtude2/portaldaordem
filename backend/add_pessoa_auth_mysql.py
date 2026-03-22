from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load .env to get DATABASE_URL
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

# Create engine
engine = create_engine(DATABASE_URL)

print(f"Conectado ao banco: {DATABASE_URL.split('@')[-1]}")

# Using begin() to handle transaction automatically in SQLAlchemy 2.0
with engine.begin() as conn:
    # Check if columns exist first (optional but safer)
    try:
        # MySQL syntax for adding columns
        conn.execute(text("ALTER TABLE pessoas ADD COLUMN login VARCHAR(100) UNIQUE AFTER cargo"))
        print("Coluna 'login' adicionada.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Coluna 'login' já existe.")
        else:
            print(f"Erro ao adicionar 'login': {e}")
            
    try:
        conn.execute(text("ALTER TABLE pessoas ADD COLUMN senha VARCHAR(100) AFTER login"))
        print("Coluna 'senha' adicionada.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Coluna 'senha' já existe.")
        else:
            print(f"Erro ao adicionar 'senha': {e}")

print("Migração concluída.")
