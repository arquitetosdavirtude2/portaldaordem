from database import engine
from sqlalchemy import text

def fix_db():
    try:
        with engine.connect() as conn:
            # Check for data_upload
            res = conn.execute(text("SHOW COLUMNS FROM entregas_trabalho LIKE 'data_upload'"))
            if not res.fetchone():
                print("Adicionando coluna data_upload...")
                conn.execute(text("ALTER TABLE entregas_trabalho ADD COLUMN data_upload VARCHAR(30)"))
                print("Coluna data_upload adicionada!")

            # Check for corrigido_por
            res = conn.execute(text("SHOW COLUMNS FROM entregas_trabalho LIKE 'corrigido_por'"))
            if not res.fetchone():
                print("Adicionando coluna corrigido_por...")
                conn.execute(text("ALTER TABLE entregas_trabalho ADD COLUMN corrigido_por INT"))
                # Note: ADD FOREIGN KEY is not strictly necessary for our SQLAlchemy usage right now if we just need the column, 
                # but we'll leave it as a simple INT to avoid constraint issues.
                print("Coluna corrigido_por adicionada!")

            # Check for data_correcao
            res = conn.execute(text("SHOW COLUMNS FROM entregas_trabalho LIKE 'data_correcao'"))
            if not res.fetchone():
                print("Adicionando coluna data_correcao...")
                conn.execute(text("ALTER TABLE entregas_trabalho ADD COLUMN data_correcao VARCHAR(30)"))
                print("Coluna data_correcao adicionada!")
                
            conn.commit()
            print("Alterações concluídas.")
    except Exception as e:
        print(f"Erro ao atualizar banco: {e}")

if __name__ == "__main__":
    fix_db()
