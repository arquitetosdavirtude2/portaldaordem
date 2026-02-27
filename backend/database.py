from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# Usar variável de ambiente ou SQLite local para testes
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

# No cPanel, conexões TCP locais muitas vezes sofrem timeout silencioso (SYN drop)
# Forçamos o uso do socket UNIX nativo do MySQL quando rodando em produção.
if "mysql" in DATABASE_URL and ("@localhost" in DATABASE_URL or "@127.0.0.1" in DATABASE_URL):
    DATABASE_URL = DATABASE_URL.replace("@127.0.0.1", "@localhost")
    if "unix_socket=" not in DATABASE_URL:
        if "?" in DATABASE_URL:
            DATABASE_URL += "&unix_socket=/var/lib/mysql/mysql.sock"
        else:
            DATABASE_URL += "?unix_socket=/var/lib/mysql/mysql.sock"

# Configura engine com parâmetros específicos por banco
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "mysql" in DATABASE_URL:
    # Timeout de 5s na conexão — evita o Python travar se o MySQL estiver lento
    connect_args = {"connect_timeout": 5}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,      # Verifica conexão antes de usar
    pool_recycle=1800,        # Recicla conexões a cada 30min
    pool_timeout=10,          # Espera no máximo 10s para obter conexão do pool
    pool_size=5,              # Máximo 5 conexões simultâneas
    max_overflow=2,           # Permite até 2 extras em pico
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
