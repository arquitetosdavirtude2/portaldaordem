import sqlalchemy
from sqlalchemy import text

try:
    engine = sqlalchemy.create_engine('mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4')
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE pessoas ADD COLUMN loja_id INT NULL'))
        conn.execute(text('ALTER TABLE pessoas ADD CONSTRAINT fk_pessoas_lojas FOREIGN KEY (loja_id) REFERENCES lojas(id)'))
        conn.commit()
    print('MySQL Migration loja_id Success')
except Exception as e:
    print(f"Error: {e}")
