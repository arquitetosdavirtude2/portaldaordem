from sqlalchemy import text
from database import TreasurySessionLocal

db = TreasurySessionLocal()
print("--- LOJAS ---")
res = db.execute(text("SELECT id, nome FROM lojas")).fetchall()
for r in res:
    print(f"ID: {r[0]}, Nome: '{r[1]}'")

print("\n--- CAIXAS ---")
res = db.execute(text("SELECT id, nome, loja_id FROM caixas")).fetchall()
for r in res:
    print(f"ID: {r[0]}, Nome: '{r[1]}', LojaID: {r[2]}")

print("\n--- PENDENCIAS POR LOJA ---")
res = db.execute(text("""
    SELECT c.loja_id, t.tipo, SUM(t.valor) 
    FROM transacoes t 
    JOIN caixas c ON t.caixa_id = c.id 
    WHERE t.status = 'pendente' 
    GROUP BY c.loja_id, t.tipo
""")).fetchall()
for r in res:
    print(f"Loja: {r[0]}, Tipo: {r[1]}, Total: {r[2]}")
db.close()
