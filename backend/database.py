from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# 1. Main Database (MySQL for original data)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

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

# 2. Treasury Database (Always local SQLite to avoid permission issues)
TREASURY_DB_URL = "sqlite:///./treasury.db" 
treasury_engine = get_engine(TREASURY_DB_URL, is_sqlite=True)
TreasurySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=treasury_engine)

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
