from sqlalchemy import create_engine, text
engine = create_engine('mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4')
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, descricao, valor, data_vencimento FROM transacoes WHERE descricao LIKE '%Per Capta%'")).fetchall()
    for r in res:
        print(r)
