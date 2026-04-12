from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

# CONFIGURAÇÃO PADRÃO CPANEL
# Tentamos localhost (padrão) com suporte a timeout para não travar o site
DATABASE_URL = "mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4"

def get_engine(url):
    return create_engine(
        url, 
        connect_args={"connect_timeout": 3}, # 3 segundos e para tudo
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
