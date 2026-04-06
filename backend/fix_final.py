import os
import sqlite3
import sqlalchemy
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TREASURY_DB_PATH = os.path.join(BASE_DIR, "treasury.db")
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

def fix_all():
    mysql_url = os.getenv('DATABASE_URL')
    print(f"DEBUG: MySQL URL: {mysql_url}")
    print(f"DEBUG: SQLite Path: {TREASURY_DB_PATH}")
    
    try:
        # 1. Get from MySQL
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            query = text("SELECT id, nome, loja_id, estado_id, cargo, status FROM pessoas")
            pessoas = conn.execute(query).fetchall()
            print(f"DEBUG: Found {len(pessoas)} people in MySQL.")
            
        # 2. Update SQLite
        conn_sq = sqlite3.connect(TREASURY_DB_PATH)
        cursor = conn_sq.cursor()
        
        # Mirror people
        cursor.execute("DELETE FROM pessoas")
        for p in pessoas:
            cursor.execute(
                "INSERT INTO pessoas (id, estado_id, loja_id, nome, cargo, status) VALUES (?, ?, ?, ?, ?, ?)",
                (p[0], p[1], p[2] or 1, p[3], p[4], p[5])
            )
            
        # Bind transactions (Michel is ID 6)
        cursor.execute("UPDATE transacoes SET caixa_id = 2, pessoa_id = 6")
        cursor.execute("UPDATE caixas SET loja_id = 1")
        
        conn_sq.commit()
        conn_sq.close()
        print("--- FIX COMPLETE ---")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_all()
