from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT mes_referencia FROM transacoes WHERE categoria = 'mensalidade' LIMIT 5")).fetchall()
for r in res:
    print(f"'{r[0]}'")
db.close()
