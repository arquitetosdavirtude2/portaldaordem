from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
res = db.execute(text("SELECT status, tipo, valor, categoria FROM transacoes")).fetchall()
# Print counts of status and tipo
stats = {}
for r in res:
    key = (r[0], r[1])
    stats[key] = stats.get(key, 0) + 1
print(stats)
db.close()
