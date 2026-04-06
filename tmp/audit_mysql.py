import os
import pymysql
from dotenv import load_dotenv

# Connect directly using pymysql to avoid sqlalchemy complexity for now
def audit():
    load_dotenv('backend/.env')
    url = os.getenv('DATABASE_URL')
    # Parse URL: mysql+pymysql://user:pass@localhost/db
    part1 = url.split('://')[1]
    cred, rest = part1.split('@')
    user, password = cred.split(':')
    host_db = rest.split('/')[0]
    db_name = rest.split('/')[1].split('?')[0]
    
    conn = pymysql.connect(
        host='localhost',
        user=user,
        password=password,
        database=db_name,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, nome FROM lojas")
        lojas = cursor.fetchall()
        print(f"DEBUG: MySQL Lojas: {lojas}")
        
        cursor.execute("SELECT id, nome, loja_id FROM pessoas")
        pessoas = cursor.fetchall()
        print(f"DEBUG: MySQL People: {pessoas}")
        
    conn.close()

if __name__ == "__main__":
    audit()
