import sqlite3
import os

db_path = "backend/treasury.db"
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- CAIXAS ---")
    cursor.execute("SELECT id, nome, tipo, saldo_atual FROM caixas")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- TRANSACOES ---")
    cursor.execute("SELECT id, caixa_id, tipo, categoria, valor, data_vencimento, status FROM transacoes")
    for row in cursor.fetchall():
        print(row)
    
    conn.close()
