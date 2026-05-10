from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        # Exact same query structure as the screenshot
        sql = text("""
            INSERT INTO transacoes (caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, mes_referencia, descricao, notas, anexo_url, status, recorrencia)
            VALUES (1, NULL, 1, 'entrada', 'teste', 0, '2024-05-10', '2024-05-10', '2024-05', 'teste', '', NULL, 'pago', 'nenhuma')
        """)
        conn.execute(sql)
        conn.commit()
        print("Insert successful!")
        conn.execute(text("DELETE FROM transacoes WHERE categoria = 'teste'"))
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
