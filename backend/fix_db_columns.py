from database import engine
from sqlalchemy import text

def fix_db():
    try:
        with engine.connect() as conn:
            # Check if column exists
            res = conn.execute(text("SHOW COLUMNS FROM conteudos_estudo LIKE 'descricao_jornada'"))
            column_exists = res.fetchone()
            
            if not column_exists:
                print("Adicionando coluna descricao_jornada...")
                conn.execute(text("ALTER TABLE conteudos_estudo ADD COLUMN descricao_jornada TEXT"))
                conn.execute(text("COMMIT"))
                print("Coluna adicionada com sucesso!")
            else:
                print("A coluna descricao_jornada já existe.")
                
            # Also check for imagem_jornada_url just in case
            res = conn.execute(text("SHOW COLUMNS FROM conteudos_estudo LIKE 'imagem_jornada_url'"))
            if not res.fetchone():
                print("Adicionando coluna imagem_jornada_url...")
                conn.execute(text("ALTER TABLE conteudos_estudo ADD COLUMN imagem_jornada_url VARCHAR(255)"))
                conn.execute(text("COMMIT"))
                print("Coluna imagem_jornada_url adicionada!")
                
    except Exception as e:
        print(f"Erro ao atualizar banco: {e}")

if __name__ == "__main__":
    fix_db()
