from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# Usar variável de ambiente ou SQLite local para testes
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

# Configura engine com parâmetros específicos por banco
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Verifica conexão antes de usar (evita erros de timeout)
    pool_recycle=3600,    # Recicla conexões a cada 1h (importante para MySQL em shared hosting)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency para usar nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
