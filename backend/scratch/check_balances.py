import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    for date in ['2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']:
        res = conn.execute(text(f"""
            SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
            FROM transacoes
            WHERE caixa_id = 1 AND status = 'pago' AND data_vencimento < '{date}'
        """))
        print(f"Saldo em {date}: R$ {res.fetchone()[0]:,.2f}")
