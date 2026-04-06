import os
from sqlalchemy import text
from database import engine
from dotenv import load_dotenv

def diagnose():
    load_dotenv('.env')
    print("DEBUG: Final MySQL check...")
    try:
        with engine.connect() as conn:
            # Check Lojas - Only ID and Nome
            lojas = conn.execute(text("SELECT id, nome FROM lojas")).fetchall()
            print(f"DEBUG: Lojas: {lojas}")
                
            # Check current people in MySQL
            pessoas = conn.execute(text("SELECT id, nome, loja_id FROM pessoas")).fetchall()
            print(f"DEBUG: Pessoas: {pessoas}")
            
            # Check users to see which lodge they belong to
            usuarios = conn.execute(text("SELECT id, username, role, loja_id FROM usuarios")).fetchall()
            print(f"DEBUG: Usuarios: {usuarios}")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    diagnose()
