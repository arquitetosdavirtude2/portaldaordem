from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("""
    SELECT c.nome, 
           SUM(CASE WHEN t.tipo='entrada' THEN t.valor ELSE -t.valor END) as saldo
    FROM transacoes t
    JOIN caixas c ON t.caixa_id = c.id
    WHERE t.status = 'pago'
    GROUP BY c.nome
""")).fetchall()
for r in res:
    print(f"Caixa: '{r[0]}', Saldo: {r[1]}")
db.close()
