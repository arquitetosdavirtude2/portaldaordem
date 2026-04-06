import os
import sqlite3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path to the .env file in the backend folder
load_dotenv('backend/.env')

def ultimate_sync():
    # 1. Connect to MySQL (The Truth for People)
    mysql_url = os.getenv('DATABASE_URL')
    print("DEBUG: Connecting to MySQL...")
    try:
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            # Get all people
            pessoas = conn.execute(text("SELECT id, nome, loja_id, estado_id, cargo, status FROM pessoas")).fetchall()
            print(f"DEBUG: Found {len(pessoas)} people in MySQL.")
            
            # 2. Connect to SQLite (Treasury DB)
            sqlite_path = 'backend/treasury.db'
            conn_sq = sqlite3.connect(sqlite_path)
            cursor = conn_sq.cursor()
            
            # Clean and re-import People to SQLite with EXACT SAME IDs
            # This is critical so Transacao.pessoa_id = 6 found in MySQL matches ID 6 in SQLite!
            cursor.execute("DELETE FROM pessoas")
            for p in pessoas:
                # Assuming SQLite table structure matches: id, estado_id, loja_id, nome...
                # id=0, estado_id=1, loja_id=2, nome=3, cargo=4, status=5
                cursor.execute(
                    "INSERT INTO pessoas (id, estado_id, loja_id, nome, cargo, status) VALUES (?, ?, ?, ?, ?, ?)",
                    (p[0], p[1], p[2] or 1, p[3], p[4], p[5])
                )
            
            # Ensure transactions are linked to Michel (ID 6)
            cursor.execute("UPDATE transacoes SET pessoa_id = 6")
            
            # Ensure all caixas are linked to Loja 1
            cursor.execute("UPDATE caixas SET loja_id = 1")
            
            conn_sq.commit()
            conn_sq.close()
            print(f"DEBUG: Successfully imported {len(pessoas)} people to SQLite and linked transactions.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    ultimate_sync()
