from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT id, nome FROM lojas")).fetchall()
for r in res:
    print(f"ID: {r[0]}, Nome: '{r[1]}'")
db.close()
