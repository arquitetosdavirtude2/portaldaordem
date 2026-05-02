from database import engine, Base
import models

def migrate():
    print("Iniciando migração de banco de dados...")
    try:
        # Create tables that don't exist
        Base.metadata.create_all(bind=engine)
        print("Tabela extratos_mensais criada com sucesso (ou já existia).")
    except Exception as e:
        print(f"Erro ao criar tabelas: {e}")

if __name__ == "__main__":
    migrate()
