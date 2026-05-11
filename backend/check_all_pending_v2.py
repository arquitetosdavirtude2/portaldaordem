from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT t.id, t.tipo, t.status, t.valor, t.categoria, c.loja_id FROM transacoes t JOIN caixas c ON t.caixa_id = c.id WHERE t.status = 'pendente'")).fetchall()
for r in res:
    print(f"ID: {r[0]}, Tipo: '{r[1]}', Status: '{r[2]}', Val: {r[3]}, Cat: '{r[4]}', Loja: {r[5]}")
db.close()
