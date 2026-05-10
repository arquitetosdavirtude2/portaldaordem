from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

cols_to_add = [
    ("mes_referencia", "varchar(7)"),
    ("grupo_recorrencia", "varchar(50)"),
    ("parcela_atual", "int"),
    ("total_parcelas", "int")
]

with engine.connect() as conn:
    for col, ctype in cols_to_add:
        try:
            print(f"Adding {col}...")
            conn.execute(text(f"ALTER TABLE transacoes ADD COLUMN {col} {ctype}"))
            conn.commit()
            print(f"Column {col} added.")
        except Exception as e:
            print(f"Could not add {col}: {e}")

    try:
        print("Adding finalidade to caixas...")
        conn.execute(text("ALTER TABLE caixas ADD COLUMN finalidade varchar(50) DEFAULT 'geral'"))
        conn.commit()
        print("Column finalidade added.")
    except Exception as e:
        print(f"Could not add finalidade: {e}")
