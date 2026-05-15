from database import engine, Base
import models # Importar para registrar os modelos no Base.metadata

def create_tables():
    try:
        print("Criando tabelas...")
        Base.metadata.create_all(bind=engine)
        print("Tabelas criadas com sucesso!")
    except Exception as e:
        print(f"Erro ao criar tabelas: {e}")

if __name__ == "__main__":
    create_tables()
