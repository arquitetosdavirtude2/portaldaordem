import sqlalchemy
from sqlalchemy import text
from urllib.parse import quote_plus
import traceback

try:
    safe_pwd = quote_plus("96389347")
    conn_str = f'mysql+pymysql://root:{safe_pwd}@localhost/portald3_gomb?charset=utf8mb4'
    engine = sqlalchemy.create_engine(conn_str)
    
    with engine.connect() as conn:
        print("Connected as root with password: ***")
        try:
            conn.execute(text('ALTER TABLE pessoas ADD COLUMN cargo VARCHAR(100) NULL'))
            print("Successfully added cargo to pessoas")
        except Exception as e:
            print(f"Skipped cargo or error: {e}")
            
        conn.commit()
        print('MySQL Migration Cargo as Root Success')
        
except Exception as e:
    print(f"Failed to connect or migrate: {e}")
    traceback.print_exc()
