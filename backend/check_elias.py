from database import engine
from sqlalchemy import text

def check_elias():
    with engine.connect() as conn:
        res = conn.execute(text('SELECT id, nome, login, role, loja_id FROM usuarios'))
        print("Usuários:", res.fetchall())
        
        res = conn.execute(text('SELECT id, nome FROM lojas'))
        print("Lojas:", res.fetchall())

if __name__ == "__main__":
    check_elias()
