import sqlalchemy
from sqlalchemy import text
engine=sqlalchemy.create_engine('mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/portald3_gomb?charset=utf8mb4')
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE lojas ADD COLUMN rito VARCHAR(50) NULL'))
    conn.commit()
print('MySQL Migration Rito Success')
