from database import SessionLocal
from models import Pessoa, Loja, Transacao
import json

db = SessionLocal()
try:
    pessoas = db.query(Pessoa).all()
    lojas = db.query(Loja).all()
    
    print("--- PESSOAS ---")
    for p in pessoas:
        print(f"ID: {p.id}, Nome: {p.nome}, LojaID: {p.loja_id}, Admissao: {p.data_admissao}")
        
    print("\n--- LOJAS ---")
    for l in lojas:
        print(f"ID: {l.id}, Nome: {l.nome}")

    print("\n--- TRANSACOES RECENTES ---")
    trans = db.query(Transacao).order_by(Transacao.id.desc()).limit(10).all()
    for t in trans:
        print(f"ID: {t.id}, PessoaID: {t.pessoa_id}, Cat: {t.categoria}, Valor: {t.valor}, Status: {t.status}")
finally:
    db.close()
