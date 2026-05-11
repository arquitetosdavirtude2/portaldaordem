from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT DISTINCT categoria FROM transacoes")).fetchall()
for r in res:
    print(f"'{r[0]}'")
db.close()
