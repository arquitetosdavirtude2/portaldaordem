from database import engine
from sqlalchemy import text

def update_db():
    try:
        with engine.connect() as conn:
            conn.execute(text('ALTER TABLE conteudos_estudo ADD COLUMN descricao_jornada TEXT'))
            conn.commit()
            print('Coluna descricao_jornada adicionada com sucesso')
    except Exception as e:
        print(f"Erro ou coluna já existe: {e}")

if __name__ == "__main__":
    update_db()
