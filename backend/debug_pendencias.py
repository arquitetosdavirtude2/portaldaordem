from database import TreasurySessionLocal
from sqlalchemy import text
from datetime import datetime

db = TreasurySessionLocal()
try:
    # Check all pending entries
    res = db.execute(text("""
        SELECT id, valor, data_vencimento, categoria, descricao 
        FROM transacoes 
        WHERE loja_id = 1 
          AND status = 'pendente' 
          AND tipo = 'entrada' 
          AND categoria NOT IN ('mensalidade', 'joia')
    """)).fetchall()
    
    print(f"Total found: {len(res)}")
    total_sum = 0
    for r in res:
        print(f"ID: {r[0]}, Valor: {r[1]}, Venc: {r[2]}, Cat: {r[3]}, Desc: {r[4]}")
        total_sum += float(r[1])
    print(f"Grand Total: {total_sum}")

    # Check for current month (May 2026)
    res_maio = db.execute(text("""
        SELECT id, valor, data_vencimento, categoria, descricao 
        FROM transacoes 
        WHERE loja_id = 1 
          AND status = 'pendente' 
          AND tipo = 'entrada' 
          AND categoria NOT IN ('mensalidade', 'joia')
          AND data_vencimento LIKE '2026-05%'
    """)).fetchall()
    print(f"\nTotal May 2026: {len(res_maio)}")
    total_maio = 0
    for r in res_maio:
        total_maio += float(r[1])
    print(f"Total May: {total_maio}")

finally:
    db.close()
