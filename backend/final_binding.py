import os
import sqlite3
from dotenv import load_dotenv

# Path to the .env file in the backend folder
load_dotenv('backend/.env')

def final_binding():
    # Connect to SQLite (Treasury DB)
    sqlite_path = 'backend/treasury.db'
    if not os.path.exists(sqlite_path):
        print(f"ERROR: SQLite DB not found at {sqlite_path}")
        return

    try:
        conn_sq = sqlite3.connect(sqlite_path)
        cursor = conn_sq.cursor()
        
        # 1. Ensure all People are linked to Lodge 1 in the SQLite table
        # This is where the 'Joias & Mensalidades' tab looks
        cursor.execute("UPDATE pessoas SET loja_id = 1")
        print(f"DEBUG: Linked {cursor.rowcount} people to Lodge 1 in SQLite.")
        
        # 2. Bind all Transactions to Caixa ID 2 (where the R$ 750 balance is)
        # and to Michel (ID 6). This makes them appear under the cards.
        cursor.execute("UPDATE transacoes SET caixa_id = 2, pessoa_id = 6")
        print(f"DEBUG: Bound {cursor.rowcount} transactions to Caixa 2 and Michel (ID 6).")
        
        # 3. Double check caixas
        cursor.execute("UPDATE caixas SET loja_id = 1 WHERE id = 2")
        
        conn_sq.commit()
        conn_sq.close()
        print("--- FINAL BINDING COMPLETE ---")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    final_binding()
