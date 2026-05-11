from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT id, status, tipo, valor, categoria, mes_referencia FROM transacoes WHERE tipo = 'entrada'")).fetchall()
for r in res:
    print(f"ID: {r[0]}, Status: '{r[1]}', Tipo: '{r[2]}', Val: {r[3]}, Cat: '{r[4]}', Ref: '{r[5]}'")
db.close()
