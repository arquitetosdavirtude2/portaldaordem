import sys
import os

# Adiciona o diretório atual ao sys.path para importar database e models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, treasury_engine
import models

def create_treasury_schema():
    print(f"DEBUG: Creating schema in Treasury DB...")
    # SQLAlchemy will create all tables defined in models.py (Transacao, Pessoa, Caixa)
    Base.metadata.create_all(bind=treasury_engine)
    print("--- SCHEMA CREATED ---")

if __name__ == "__main__":
    create_treasury_schema()
