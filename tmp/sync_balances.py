import sqlite3
import os

# Base directory for the database
DB_PATH = 'backend/treasury.db'

def sync():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- Starting Audit ---")
    
    # 1. Get all boxes
    cursor.execute("SELECT id, nome, tipo, saldo_atual FROM caixas")
    caixas = cursor.fetchall()

    for c_id, c_nome, c_tipo, c_saldo in caixas:
        print(f"\nAudit: Box {c_id} ({c_nome})")
        
        # 2. Calculate real sum of paid transactions
        cursor.execute("SELECT SUM(CASE WHEN tipo='entrada' THEN valor ELSE -valor END) FROM transacoes WHERE caixa_id = ? AND status = 'pago'", (c_id,))
        real_sum = cursor.fetchone()[0] or 0.0
        
        print(f"  Current Balance in table: R$ {c_saldo}")
        print(f"  Calculated Sum of transactions: R$ {real_sum}")
        
        if c_saldo != real_sum:
            print(f"  --> SYNCING: Updating balance to R$ {real_sum}")
            cursor.execute("UPDATE caixas SET saldo_atual = ? WHERE id = ?", (real_sum, c_id))
        else:
            print(f"  --> Consistent.")

    conn.commit()
    conn.close()
    print("\n--- Sync Complete ---")

if __name__ == "__main__":
    sync()
