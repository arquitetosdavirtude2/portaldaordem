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

def nuclear_reset():
    mysql_url = os.getenv('DATABASE_URL')
    print(f"DEBUG: SQLite Path: {TREASURY_DB_PATH}")
    
    try:
        # 1. Connect to SQLite
        conn_sq = sqlite3.connect(TREASURY_DB_PATH)
        cursor = conn_sq.cursor()
        
        # Clean everything for a fresh start (REAL database, no mock)
        cursor.execute("DELETE FROM transacoes")
        cursor.execute("DELETE FROM caixas")
        
        # Create CAIXA ID 2 (Joias e Mensalidade) if not exists
        cursor.execute(
            "INSERT INTO caixas (id, loja_id, nome, tipo, saldo_atual) VALUES (?, ?, ?, ?, ?)",
            (2, 1, "BANCO PAN", "joias_mensalidade", 750.0)
        )
        
        # INSERT the missing transactions (R$ 500 and R$ 250)
        # Columns: id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status
        cursor.execute(
            "INSERT INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (2, 2, 6, 1, 'entrada', 'mensalidade', 250.0, '2026-04-03', 'pago', 'Parcela 1/4 da Joia')
        )
        cursor.execute(
            "INSERT INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (3, 2, 6, 1, 'entrada', 'joia', 500.0, '2026-04-03', 'pago', 'Joia de Admissão')
        )
        
        # Mirror people from MySQL to ensure ID 6 exists
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            p_data = conn.execute(text("SELECT id, estado_id, loja_id, nome, status, cargo FROM pessoas")).fetchall()
            cursor.execute("DELETE FROM pessoas")
            for p in p_data:
                 cursor.execute(
                    "INSERT INTO pessoas (id, estado_id, loja_id, nome, status, cargo) VALUES (?, ?, ?, ?, ?, ?)",
                    (p[0], p[1], p[2] or 1, p[3], p[4], p[5])
                )
        
        conn_sq.commit()
        conn_sq.close()
        print("--- NUCLEAR RESET COMPLETE: Data Re-Inserted ---")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    nuclear_reset()
