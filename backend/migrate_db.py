from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load env from the same way as database.py
load_dotenv(".env")
raw_url = os.getenv("DATABASE_URL")

if raw_url and "mysql" in raw_url:
    engine = create_engine(raw_url)
    with engine.connect() as conn:
        try:
            print("Verificando coluna 'recorrencia' na tabela 'transacoes'...")
            res = conn.execute(text("DESCRIBE transacoes")).fetchall()
            cols = [r[0] for r in res]
            if "recorrencia" not in cols:
                print("Adicionando coluna 'recorrencia'...")
                conn.execute(text("ALTER TABLE transacoes ADD COLUMN recorrencia VARCHAR(50) DEFAULT 'nenhuma' AFTER status"))
                conn.commit()
                print("Coluna adicionada com sucesso!")
            else:
                print("Coluna 'recorrencia' já existe.")
        except Exception as e:
            print(f"Erro na migração: {e}")
else:
    print("DATABASE_URL não encontrada ou não é MySQL.")
