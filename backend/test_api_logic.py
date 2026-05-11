from sqlalchemy import text
from database import TreasurySessionLocal
from routes.tesouraria import _get_mensalidades_vencidas
from datetime import datetime

db = TreasurySessionLocal()
# Let's check some people
irmaos = db.execute(text("SELECT id, nome FROM pessoas WHERE loja_id = 1 AND ativo = 1")).fetchall()
print(f"Total irmaos: {len(irmaos)}")

data_limite = datetime.now()

for i in irmaos:
    pend = _get_mensalidades_vencidas(i.id, data_limite, db)
    if pend > 0:
        print(f"Irmao: {i.nome}, Pendente: {pend}")

db.close()
