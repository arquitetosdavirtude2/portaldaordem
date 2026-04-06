import os
from sqlalchemy import text
from database import engine, get_db
from models import Pessoa, Loja, Usuario
from dotenv import load_dotenv

def diagnose():
    load_dotenv('.env')
    print("DEBUG: Checking MySQL database via SQLAlchemy engine...")
    try:
        with engine.connect() as conn:
            # Check Lojas
            lojas = conn.execute(text("SELECT id, nome, numero, cidade FROM lojas")).fetchall()
            print(f"DEBUG: Lojas Found: {len(lojas)}")
            for l in lojas:
                print(f"  - ID: {l[0]}, Nome: {l[1]}, Numero: {l[2]}")
                
            # Check Users/Authentication to see current session context
            usuarios = conn.execute(text("SELECT id, username, role, loja_id FROM usuarios")).fetchall()
            print(f"DEBUG: Usuarios Found: {len(usuarios)}")
            for u in usuarios:
                print(f"  - User: {u[1]}, Role: {u[2]}, LodgeID: {u[3]}")
                
            # Check People
            pessoas = conn.execute(text("SELECT id, nome, loja_id FROM pessoas")).fetchall()
            print(f"DEBUG: Pessoas Found: {len(pessoas)}")
            for p in pessoas:
                if p[1] and "Michel" in p[1]:
                    print(f"  - MATCH MICHEL: ID {p[0]}, Nome: {p[1]}, LojaID: {p[2]}")
                else:
                    print(f"  - ID {p[0]}, Nome: {p[1]}, LojaID: {p[2]}")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    diagnose()
