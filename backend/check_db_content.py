from database import engine
from sqlalchemy import text

def check_content():
    try:
        with engine.connect() as conn:
            res = conn.execute(text('SELECT * FROM conteudos_estudo'))
            data = res.fetchall()
            print(f"Conteúdos no DB ({len(data)}):", data)
            
            res = conn.execute(text('SELECT id, nome FROM lojas'))
            print("Lojas:", res.fetchall())
            
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_content()
