from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Absolute Path for .env discovery (Aggressive search for cPanel)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_ENV_PATHS = [
    os.path.join(BASE_DIR, ".env"), # inside backend/
    os.path.join(os.path.dirname(BASE_DIR), ".env"), # site root
    os.path.join(os.path.expanduser("~"), ".env"), # home dir
    ".env" # current working dir
]

env_found = False
for path in POSSIBLE_ENV_PATHS:
    if os.path.exists(path):
        load_dotenv(path)
        env_found = True
        break

# 1. Main Database (MySQL for original data)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Se estivermos no servidor (Unix), não permitimos rodar sem MySQL configurado
    if os.name != 'nt':
        raise RuntimeError("ERRO CRÍTICO: DATABASE_URL não encontrada no ambiente ou arquivo .env!")
    else:
        # Apenas localmente mantemos o fallback para desenvolvimento
        DATABASE_URL = "sqlite:///./database.db"

# cPanel Socket logic for MySQL
if "mysql" in DATABASE_URL and ("@localhost" in DATABASE_URL or "@127.0.0.1" in DATABASE_URL):
    DATABASE_URL = DATABASE_URL.replace("@127.0.0.1", "@localhost")
    if os.name != 'nt':
        if "unix_socket=" not in DATABASE_URL:
            if "?" in DATABASE_URL:
                DATABASE_URL += "&unix_socket=/var/lib/mysql/mysql.sock"
            else:
                DATABASE_URL += "?unix_socket=/var/lib/mysql/mysql.sock"

def get_engine(url, is_sqlite=False):
    connect_args = {}
    if is_sqlite or "sqlite" in url:
        connect_args = {"check_same_thread": False}
    elif "mysql" in url:
        connect_args = {"connect_timeout": 5}
    return create_engine(url, connect_args=connect_args, poolclass=NullPool)

engine = get_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Treasury Database (UNIFIED IN MYSQL as requested)
TREASURY_DB_URL = DATABASE_URL
treasury_engine = engine # Reuse the main MySQL engine
TreasurySessionLocal = SessionLocal # Reuse the main SessionLocal

Base = declarative_base()

# Main DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Treasury DB Dependency (Inquebrável)
def get_treasury_db():
    db = TreasurySessionLocal()
    try:
        yield db
    finally:
        db.close()

print(f"BANCO PRINCIPAL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
print(f"BANCO TESOURARIA: {TREASURY_DB_URL}")
