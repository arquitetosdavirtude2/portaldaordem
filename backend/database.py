from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

# CONFIGURAÇÃO DE PRODUÇÃO (FORÇADA E SIMPLIFICADA)
# Usamos 127.0.0.1 ou localhost com trava de reconexão automática
DATABASE_URL = "mysql+pymysql://portald3_user:gWh28%40dGcMp@127.0.0.1/portald3_gomb?charset=utf8mb4"

def get_engine(url):
    # pool_pre_ping=True ajuda o cPanel a reconectar se o banco cair por inatividade
    return create_engine(
        url, 
        connect_args={"connect_timeout": 10}, 
        poolclass=NullPool
    )

engine = get_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
