from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

# CONFIGURAÇÃO PADRÃO CPANEL (ESTÁVEL)
# Usamos localhost (socket) que é a conexão mais rápida no cPanel
DATABASE_URL = "mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4"

def get_engine(url):
    return create_engine(
        url, 
        connect_args={"connect_timeout": 5}, 
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
