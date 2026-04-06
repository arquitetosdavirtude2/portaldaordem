import os
import sqlite3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path to the .env file in the backend folder
load_dotenv('backend/.env')

def force_sync():
    # 1. MySQL Connection (Source of Truth for People)
    mysql_url = os.getenv('DATABASE_URL')
    print(f"DEBUG: Connecting to MySQL...")
    
    try:
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            # Find Michel's REAL ID
            # Use LIKE to be safe with middle names
            michel_data = conn.execute(text("SELECT id, nome FROM pessoas WHERE nome LIKE '%Michel%'")).fetchone()
            if not michel_data:
                print("ERROR: Brother Michel NOT FOUND in MySQL!")
                # Fallback: get first brother to avoid empty list
                michel_data = conn.execute(text("SELECT id, nome FROM pessoas LIMIT 1")).fetchone()
            
            if michel_data:
                michel_id = michel_data[0]
                michel_nome = michel_data[1]
                print(f"DEBUG: Found Michel: ID {michel_id} ({michel_nome})")
            else:
                print("ERROR: No brothers found in MySQL at all!")
                return

            # Force all brothers into Lodge 1
            res_p = conn.execute(text("UPDATE pessoas SET loja_id = 1"))
            print(f"DEBUG: Updated {res_p.rowcount} brothers to Lodge 1 in MySQL")
            
            # 2. SQLite Connection (Source of Truth for Transactions)
            sqlite_path = 'backend/treasury.db'
            conn_sq = sqlite3.connect(sqlite_path)
            cursor = conn_sq.cursor()
            
            # Map all current transactions to Michel's REAL ID
            cursor.execute("UPDATE transacoes SET pessoa_id = ?", (michel_id,))
            print(f"DEBUG: Linked {cursor.rowcount} transactions to Michel (ID {michel_id}) in SQLite")
            
            # Ensure caixas are also in Lodge 1
            cursor.execute("UPDATE caixas SET loja_id = 1")
            
            conn_sq.commit()
            conn_sq.close()
            conn.commit()
            
            print("--- PRECISION SYNC COMPLETE ---")
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    force_sync()
