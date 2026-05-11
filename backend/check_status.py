from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT status, COUNT(*) FROM transacoes GROUP BY status")).fetchall()
for r in res:
    print(f"Status: '{r[0]}', Count: {r[1]}")
db.close()
