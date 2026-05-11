from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT t.mes_referencia, t.data_vencimento, t.categoria, c.loja_id FROM transacoes t JOIN caixas c ON t.caixa_id = c.id WHERE t.status = 'pendente' AND t.tipo = 'entrada'")).fetchall()
for r in res:
    print(f"Ref: '{r[0]}', Venc: '{r[1]}', Cat: '{r[2]}', Loja: {r[3]}")
db.close()
