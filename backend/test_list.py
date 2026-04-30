from database import SessionLocal
from sqlalchemy import text
from routes.pessoas import listar_pessoas_loja

db = SessionLocal()
try:
    # Vamos testar com a loja 1
    pessoas = listar_pessoas_loja(loja_id=1, db=db)
    print(f"Sucesso! Encontrados {len(pessoas)} obreiros.")
    for p in pessoas:
        print(f"- {p['nome']} (Ativo: {p['ativo']})")
except Exception as e:
    print(f"ERRO FATAL NA LISTAGEM: {e}")
finally:
    db.close()
