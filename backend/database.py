from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Absolute Path for .env
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Exhaustive search for .env in cPanel
# 1. Caminho absoluto do cPanel (mostrado no print)
# 2. Caminho relativo ao arquivo database.py
# 3. Caminho atual de execução
env_paths = [
    "/home1/portald3/public_html/portaldaordem/backend/.env", 
    os.path.join(BASE_DIR, ".env"),
    ".env"
]

found_env = False
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p, override=True)
        found_env = True
        break

raw_url = os.getenv("DATABASE_URL")

# Diagnostic logging para o log do servidor
if os.name != 'nt':
    print(f"DEBUG: .env encontrado: {found_env}")
    if not raw_url:
         # Se não houver URL no linux, avisamos mas não travamos o Python (evita 503)
         raw_url = "mysql+pymysql://missing_env@localhost/missing_db"

# Fallback apenas para DEV Local
if not raw_url:
    raw_url = "sqlite:///./database.db"

DATABASE_URL = raw_url

# cPanel Socket logic para MySQL Localhost
if DATABASE_URL and "mysql" in DATABASE_URL and "@localhost" in DATABASE_URL:
    if os.name != 'nt' and "unix_socket=" not in DATABASE_URL:
        # Padrão cPanel RapidCloud
        DATABASE_URL += ("&" if "?" in DATABASE_URL else "?") + "unix_socket=/var/lib/mysql/mysql.sock"

def get_engine(url, is_sqlite=False):
    connect_args = {}
    url_str = str(url or "")
    if is_sqlite or "sqlite" in url_str:
        connect_args = {"check_same_thread": False}
    elif "mysql" in url_str:
        connect_args = {"connect_timeout": 5}
    return create_engine(url_str, connect_args=connect_args, poolclass=NullPool)

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
