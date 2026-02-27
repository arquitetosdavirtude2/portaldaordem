from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

# Usar variável de ambiente ou SQLite local para testes
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

# No cPanel, conexões TCP locais muitas vezes sofrem timeout silencioso (SYN drop)
# Forçamos o uso do socket UNIX nativo do MySQL quando rodando em produção (Linux).
if "mysql" in DATABASE_URL and ("@localhost" in DATABASE_URL or "@127.0.0.1" in DATABASE_URL):
    DATABASE_URL = DATABASE_URL.replace("@127.0.0.1", "@localhost")
    if os.name != 'nt':  # Aplica socket apenas se NÃO estiver no Windows
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
    poolclass=NullPool,
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
