from database import engine, Base
from models import Caixa, Transacao, Loja # Import Loja to ensure it's in metadata
import models

def migrate():
    print("Iniciando criação de tabelas via SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas com sucesso (se já não existiam).")

if __name__ == "__main__":
    migrate()
