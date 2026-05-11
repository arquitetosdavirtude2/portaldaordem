from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT status, tipo, valor FROM transacoes LIMIT 20")).fetchall()
for r in res:
    print(f"Status: '{r[0]}', Tipo: '{r[1]}', Valor: {r[2]}")
db.close()
