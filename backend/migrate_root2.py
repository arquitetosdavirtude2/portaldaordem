import sqlalchemy
from sqlalchemy import text
import traceback

try:
    # Attempting to connect as root with admin123
    engine = sqlalchemy.create_engine('mysql+pymysql://root:admin123@localhost/portald3_gomb?charset=utf8mb4')
    with engine.connect() as conn:
        print("Connected as root. Escaping privileges...")
        try:
            conn.execute(text('ALTER TABLE pessoas ADD COLUMN loja_id INT NULL'))
            print("Successfully added loja_id to pessoas")
        except Exception as e:
            print(f"Skipped pessoas or error: {e}")
            
        try:
            conn.execute(text('ALTER TABLE lojas ADD COLUMN rito VARCHAR(50) NULL'))
            print("Successfully added rito to lojas")
        except Exception as e:
            print(f"Skipped lojas or error: {e}")
            
        conn.commit()
    print('MySQL Migration as Root Success')
except Exception as e:
    print(f"Failed to connect as root: {e}")
    traceback.print_exc()
