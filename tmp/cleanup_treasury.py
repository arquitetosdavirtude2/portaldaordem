import os
import sqlite3

def cleanup():
    # 1. Delete ghost DB if exists
    ghost = "treasury.db"
    if os.path.exists(ghost):
        os.remove(ghost)
        print(f"DEBUG: Deleted ghost '{ghost}'")
    else:
        print(f"DEBUG: Ghost '{ghost}' not found in root")

    # 2. Sync balances in the correct DB
    db_path = "backend/treasury.db"
    if not os.path.exists(db_path):
        print(f"ERROR: Correct DB '{db_path}' not found!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update balances based on transactions for each caixa
    cursor.execute("SELECT id FROM caixas")
    caixas = cursor.fetchall()
    for (cid,) in caixas:
        cursor.execute('SELECT SUM(valor) FROM transacoes WHERE caixa_id=? AND status="pago" AND tipo="entrada"', (cid,))
        entradas = cursor.fetchone()[0] or 0.0
        cursor.execute('SELECT SUM(valor) FROM transacoes WHERE caixa_id=? AND status="pago" AND tipo="saida"', (cid,))
        saidas = cursor.fetchone()[0] or 0.0
        saldo = entradas - saidas
        cursor.execute('UPDATE caixas SET saldo_atual=? WHERE id=?', (saldo, cid))
        print(f"DEBUG: Caixa {cid} updated to R$ {saldo}")
        
    conn.commit()
    conn.close()
    print("DEBUG: Sync complete in backend/treasury.db")

if __name__ == "__main__":
    cleanup()
