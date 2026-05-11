from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT mes_referencia, data_vencimento, categoria FROM transacoes WHERE status = 'pendente' AND tipo = 'entrada' LIMIT 10")).fetchall()
for r in res:
    print(f"Ref: '{r[0]}', Venc: '{r[1]}', Cat: '{r[2]}'")
db.close()
