import sys
import os

# Adiciona o diretório do backend ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import engine
from sqlalchemy import text

def check_db():
    with engine.connect() as conn:
        print("--- VERIFICANDO LOJAS ---")
        lojas = conn.execute(text("SELECT id, nome FROM lojas")).fetchall()
        for l in lojas:
            print(f"Loja ID: {l[0]} | Nome: {l[1]}")
        
        print("\n--- VERIFICANDO PESSOAS ---")
        pessoas = conn.execute(text("SELECT id, nome, status, loja_id, ativo, data_adormecimento FROM pessoas")).fetchall()
        print(f"Total de pessoas encontradas: {len(pessoas)}")
        for p in pessoas:
            print(f"ID: {p[0]} | Nome: {p[1]} | Status: {p[2]} | LojaID: {p[3]} | Ativo: {p[4]} | Adormecido: {p[5]}")

if __name__ == "__main__":
    check_db()
