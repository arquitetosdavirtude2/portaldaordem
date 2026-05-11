from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
print("--- PENDENCIAS COM PESSOA_ID ---")
res = db.execute(text("""
    SELECT id, pessoa_id, tipo, status, valor, categoria, data_vencimento 
    FROM transacoes 
    WHERE status = 'pendente' AND tipo = 'entrada'
""")).fetchall()
for r in res:
    print(f"ID: {r[0]}, PessoaID: {r[1]}, Tipo: '{r[2]}', Status: '{r[3]}', Val: {r[4]}, Cat: '{r[5]}', Venc: {r[6]}")

print("\n--- DISTINCT CATEGORIES FOR ENTRADA PENDENTE ---")
res = db.execute(text("SELECT DISTINCT categoria FROM transacoes WHERE status = 'pendente' AND tipo = 'entrada'")).fetchall()
for r in res:
    print(f"Cat: '{r[0]}'")

db.close()
