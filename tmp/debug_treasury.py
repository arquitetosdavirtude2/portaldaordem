import sqlite3

def audit():
    conn = sqlite3.connect('backend/treasury.db')
    cursor = conn.cursor()
    
    # Check Joias Caixa (ID 2)
    cursor.execute('SELECT id, nome, saldo_atual FROM caixas WHERE id=2')
    caixa = cursor.fetchone()
    print(f"DEBUG: Caixa ID 2 (Joias): {caixa}")
    
    # Check all transactions for this caixa
    cursor.execute('SELECT * FROM transacoes WHERE caixa_id=2')
    trans = cursor.fetchall()
    print(f"DEBUG: Found {len(trans)} transactions for Caixa 2")
    for t in trans:
        print(f"  - {t}")
        
    # Sum PAGO entries
    cursor.execute('SELECT SUM(valor) FROM transacoes WHERE caixa_id=2 AND status="pago" AND tipo="entrada"')
    s_pago = cursor.fetchone()[0] or 0.0
    print(f"DEBUG: Sum of PAGO entries: R$ {s_pago}")
    
    # Check ALL transactions to see if there are orphans
    cursor.execute('SELECT * FROM transacoes')
    all_t = cursor.fetchall()
    print(f"DEBUG: Total transactions in DB: {len(all_t)}")
    
    conn.close()

if __name__ == "__main__":
    audit()
