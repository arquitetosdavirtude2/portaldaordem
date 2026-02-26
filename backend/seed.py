"""
Seeder — popula o banco de dados com dados iniciais:
  - Admin master (senha configurável via .env)
  - 27 estados brasileiros

Uso no cPanel (Terminal ou via cPanel Python app):
    python seed.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from database import SessionLocal, engine, Base
from models import Admin, Estado

# Garante que as tabelas existem
Base.metadata.create_all(bind=engine)

ESTADOS = [
    ("AC", "Acre"),
    ("AL", "Alagoas"),
    ("AP", "Amapá"),
    ("AM", "Amazonas"),
    ("BA", "Bahia"),
    ("CE", "Ceará"),
    ("DF", "Distrito Federal"),
    ("ES", "Espírito Santo"),
    ("GO", "Goiás"),
    ("MA", "Maranhão"),
    ("MT", "Mato Grosso"),
    ("MS", "Mato Grosso do Sul"),
    ("MG", "Minas Gerais"),
    ("PA", "Pará"),
    ("PB", "Paraíba"),
    ("PR", "Paraná"),
    ("PE", "Pernambuco"),
    ("PI", "Piauí"),
    ("RJ", "Rio de Janeiro"),
    ("RN", "Rio Grande do Norte"),
    ("RS", "Rio Grande do Sul"),
    ("RO", "Rondônia"),
    ("RR", "Roraima"),
    ("SC", "Santa Catarina"),
    ("SP", "São Paulo"),
    ("SE", "Sergipe"),
    ("TO", "Tocantins"),
]

def seed():
    db = SessionLocal()
    try:
        # ── Admin ──────────────────────────────────────────────
        if db.query(Admin).count() == 0:
            senha = os.getenv("SENHA_MASTER", "admin123")
            db.add(Admin(senha_master=senha))
            db.commit()
            print(f"[OK] Admin criado com senha: {senha}")
        else:
            print("[--] Admin já existe, pulando.")

        # ── Estados ────────────────────────────────────────────
        existentes = {e.sigla for e in db.query(Estado).all()}
        novos = 0
        for sigla, nome in ESTADOS:
            if sigla not in existentes:
                db.add(Estado(sigla=sigla, nome=nome))
                novos += 1
        db.commit()
        if novos:
            print(f"[OK] {novos} estado(s) inserido(s).")
        else:
            print("[--] Estados já existem, pulando.")

        print("\nSeeder concluído com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"[ERRO] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
