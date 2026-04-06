import os
import pymysql
import json
from dotenv import load_dotenv

def diagnose():
    load_dotenv('backend/.env')
    url = os.getenv('DATABASE_URL')
    
    # Parse URL
    part1 = url.split('://')[1]
    cred, rest = part1.split('@')
    user, password = cred.split(':')
    host_db = rest.split('/')[0]
    db_name = rest.split('/')[1].split('?')[0]
    
    print(f"DEBUG: Connecting to MySQL {db_name} on {host_db} as {user}")
    
    try:
        conn = pymysql.connect(
            host='localhost',
            user=user,
            password=password,
            database=db_name,
            charset='utf8mb4'
        )
        
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SELECT id, nome FROM lojas")
            lojas = cursor.fetchall()
            print(f"DEBUG: Lojas: {json.dumps(lojas, indent=2)}")
            
            cursor.execute("SELECT id, nome, loja_id FROM pessoas")
            pessoas = cursor.fetchall()
            print(f"DEBUG: Pessoas: {json.dumps(pessoas, indent=2)}")
            
            # Find Michel
            michel = [p for p in pessoas if "Michel" in p['nome']]
            print(f"DEBUG: Michel found: {json.dumps(michel, indent=2)}")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    diagnose()
