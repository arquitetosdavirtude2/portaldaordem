import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from database import SessionLocal
from models import Pessoa, Loja

def diagnose():
    db = SessionLocal()
    try:
        print("--- LOJAS ---")
        lojas = db.query(Loja).all()
        for l in lojas:
            print(f"ID: {l.id} | Nome: {l.nome}")
            
        print("\n--- PESSOAS ---")
        pessoas = db.query(Pessoa).all()
        print(f"Total: {len(pessoas)}")
        for p in pessoas:
            print(f"ID: {p.id} | Nome: {p.nome} | Loja: {p.loja_id} | Ativo: {p.ativo} | Adorm.: '{p.data_adormecimento}'")
    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
