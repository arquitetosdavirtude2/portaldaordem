from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

# CONFIGURAÇÃO DE PRODUÇÃO (FORÇADA)
# Bloqueamos o uso de SQLite e ignoramos o arquivo .env que o cPanel não lê.
DATABASE_URL = "mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4"

# cPanel Socket logic for MySQL
if os.name != "nt":
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
        connect_args = {"connect_timeout": 10}
    return create_engine(url, connect_args=connect_args, poolclass=NullPool)

engine = get_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Unificação de Sessões (Tesouraria + Principal)
TreasurySessionLocal = SessionLocal
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_treasury_db():
    db = TreasurySessionLocal()
    try:
        yield db
    finally:
        db.close()
