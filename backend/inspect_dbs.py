import sqlite3

def check_db(db_path):
    print(f"\n--- Checking {db_path} ---")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"\nTables: {tables}")
        
        for table in ['lojas', 'usuarios', 'pessoas', 'estados', 'caixas', 'transacoes']:
            if table in tables:
                print(f"--- TABLE: {table} ---")
                cursor.execute(f"SELECT * FROM {table}")
                rows = cursor.fetchall()
                for row in rows:
                    print(row)
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

databases = ['banco.db', 'database/database.db', 'database.db', 'portal.db']
for db in databases:
    check_db(db)
