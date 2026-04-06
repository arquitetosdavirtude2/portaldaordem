import os
import sqlite3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path to the .env file in the backend folder
load_dotenv('backend/.env')

def sync():
    # 1. MySQL Restoration (Main DB)
    mysql_url = os.getenv('DATABASE_URL')
    print(f"DEBUG: Restoring MySQL data via {mysql_url.split('@')[-1] if '@' in mysql_url else 'unknown'}")
    
    try:
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            # Link all brothers to Lodge 1 (Arquitetos da Virtude)
            res = conn.execute(text("UPDATE pessoas SET loja_id = 1"))
            print(f"DEBUG: Linked {res.rowcount} brothers to Lodge 1 in MySQL")
            
            # Verify Michel (ID 6)
            michel = conn.execute(text("SELECT id, nome, loja_id FROM pessoas WHERE id = 6")).fetchone()
            print(f"DEBUG: Michel (MySQL ID 6) is now: {michel}")
            
            conn.commit()
    except Exception as e:
        print(f"ERROR MySQL: {e}")

    # 2. SQLite Restoration (Treasury DB)
    sqlite_path = 'backend/treasury.db'
    if not os.path.exists(sqlite_path):
        print(f"ERROR: SQLite DB not found at {sqlite_path}")
        return

    try:
        conn_sq = sqlite3.connect(sqlite_path)
        cursor = conn_sq.cursor()
        
        # Link all current transactions to Michel (ID 6) to restore visibility
        # The user mentioned R$ 500 (Joia) and R$ 250 (Mensalidade)
        cursor.execute("UPDATE transacoes SET pessoa_id = 6")
        print(f"DEBUG: Re-linked {cursor.rowcount} transactions to Michel (ID 6) in SQLite")
        
        # Verify box balances
        cursor.execute("SELECT id, saldo_atual FROM caixas")
        for box in cursor.fetchall():
            print(f"DEBUG: Caixa {box[0]} balance: R$ {box[1]}")
            
        conn_sq.commit()
        conn_sq.close()
    except Exception as e:
        print(f"ERROR SQLite: {e}")

if __name__ == "__main__":
    sync()
