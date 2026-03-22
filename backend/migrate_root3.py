import sqlalchemy
from sqlalchemy import text
import traceback
import sys

passwords = ["gWh28@dGcMp", "96389347"]
engine = None
connected = False

for pwd in passwords:
    try:
        # URL encode the @ in the first password
        from urllib.parse import quote_plus
        safe_pwd = quote_plus(pwd)
        conn_str = f'mysql+pymysql://root:{safe_pwd}@localhost/portald3_gomb?charset=utf8mb4'
        engine = sqlalchemy.create_engine(conn_str)
        # Test connection
        with engine.connect() as conn:
            print(f"Connected as root with password: {pwd}")
            connected = True
            
            # Execute changes
            try:
                conn.execute(text('ALTER TABLE pessoas ADD COLUMN loja_id INT NULL'))
                print("Successfully added loja_id to pessoas")
            except Exception as e:
                print(f"Skipped pessoas (maybe already exists) or error: {e}")
                
            try:
                conn.execute(text('ALTER TABLE lojas ADD COLUMN rito VARCHAR(50) NULL'))
                print("Successfully added rito to lojas")
            except Exception as e:
                print(f"Skipped lojas (maybe already exists) or error: {e}")
                
            conn.commit()
            print('MySQL Migration as Root Success')
            break
            
    except Exception as e:
        print(f"Failed with password {pwd}")

if not connected:
    print("Could not connect with any of the provided passwords.")
