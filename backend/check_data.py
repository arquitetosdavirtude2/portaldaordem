from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, nome, status, tipo_pessoa FROM pessoas LIMIT 20"))
    for row in res:
        print(row)
