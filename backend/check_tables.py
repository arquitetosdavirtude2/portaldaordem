from database import engine
from sqlalchemy import text

def check_db():
    try:
        with engine.connect() as conn:
            res = conn.execute(text('SHOW TABLES'))
            print("Tabelas:", res.fetchall())
            
            # Tentar listar colunas de conteudos se existir algo parecido
            res = conn.execute(text("SHOW TABLES LIKE '%conteudo%'"))
            tables = res.fetchall()
            print("Tabelas parecidas:", tables)
            
            for t in tables:
                col_res = conn.execute(text(f"DESCRIBE {t[0]}"))
                print(f"Colunas de {t[0]}:", col_res.fetchall())

    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_db()
