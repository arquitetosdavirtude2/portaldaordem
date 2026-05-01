import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        p = conn.execute(text('SELECT id, nome, estado_id, loja_id FROM pessoas')).fetchall()
        print('Pessoas:', p)
        e = conn.execute(text('SELECT id, sigla FROM estados')).fetchall()
        print('Estados:', e)
        l = conn.execute(text('SELECT id, nome FROM lojas')).fetchall()
        print('Lojas:', l)

if __name__ == "__main__":
    check()
