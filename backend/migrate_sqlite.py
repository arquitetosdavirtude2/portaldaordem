from sqlalchemy import create_engine
from models import Base, Caixa, Transacao, Loja, Pessoa, Usuario, Estado
import os

# Força SQLite para desenvolvimento local
SQLITE_URL = "sqlite:///./database.db"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

def migrate():
    print(f"Iniciando criação de tabelas no SQLite local ({SQLITE_URL})...")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas com sucesso no SQLite local!")

    # Adicionar Lojas Iniciais se não existirem (apenas se a tabela lojas existir)
    from sqlalchemy.orm import sessionmaker
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        lojanomes = ["Loja Exemplo 1", "Loja Exemplo 2"]
        for nome in lojanomes:
            existing = session.query(Loja).filter(Loja.nome == nome).first()
            if not existing:
                l = Loja(nome=nome, numero="123", rito="REAA")
                session.add(l)
        session.commit()
    except Exception as e:
        print(f"Erro ao popular lojas: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
