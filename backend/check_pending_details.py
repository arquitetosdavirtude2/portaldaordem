from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT t.mes_referencia, t.data_vencimento, t.categoria, t.valor, c.loja_id, t.tipo FROM transacoes t JOIN caixas c ON t.caixa_id = c.id WHERE t.status = 'pendente'")).fetchall()
for r in res:
    print(f"Ref: '{r[0]}', Venc: '{r[1]}', Cat: '{r[2]}', Val: {r[3]}, Loja: {r[4]}, Tipo: '{r[5]}'")
db.close()
